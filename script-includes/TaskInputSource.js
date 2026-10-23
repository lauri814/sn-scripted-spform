// Server-side only. Client callable: false. Reads authorized task question definitions through storage-specific readers.
// Does not modify tasks, variables, or response records.
var TaskInputSource = Class.create();
TaskInputSource.prototype = {
    initialize: function () {},

    read: function (taskId) {
        if (!/^[a-f0-9]{32}$/.test(String(taskId || "")))
            throw new Error("Open this page from a task using sysparm_task_id.");
        var base = new GlideRecordSecure("task");
        if (!base.get(taskId) || !base.canRead())
            throw new Error("The task is unavailable.");
        // Enforce the actual task subclass's ACLs, not only the base table ACL.
        var task = new GlideRecordSecure(base.getRecordClassName());
        if (!task.get(taskId) || !task.canRead() || !task.canWrite())
            throw new Error("The task is unavailable or you cannot edit it.");
        var result = {taskId: task.getUniqueValue(), taskTable: task.getRecordClassName(),
            taskNumber: task.getValue("number"), questions: []};
        var seen = {};
        if (task.instanceOf("sc_task")) {
            if (!task.request_item.canRead()) throw new Error("The Requested Item reference is unavailable.");
            var ritm = new GlideRecordSecure("sc_req_item");
            if (!ritm.get(task.getValue("request_item")) || !ritm.canRead())
                throw new Error("The task's Requested Item is unavailable.");
            result.ritmNumber = ritm.getValue("number");
            result.variableSource = {kind: "catalog", table: "sc_req_item", recordId: ritm.getUniqueValue()};
            this._readCatalog(ritm.getUniqueValue(), result, seen);
        } else if (task.instanceOf("sc_req_item")) {
            result.variableSource = {kind: "catalog", table: "sc_req_item", recordId: task.getUniqueValue()};
            this._readCatalog(task.getUniqueValue(), result, seen);
        } else {
            result.variableSource = {kind: "recordProducer", table: task.getRecordClassName(), recordId: task.getUniqueValue()};
            this._readRecordProducer(task, result, seen);
        }
        result.questions.sort(function (a, b) {return a.order - b.order;});
        return result;
    },

    // Agent-authored GUI definitions: authorize task context, resolve source
    // questions, and allow only non-executable configuration for new fields.
    buildDefinition: function (taskId, requested) {
        var source = this.read(taskId);
        if (!requested || requested.schemaVersion !== 1 || !Array.isArray(requested.elements))
            throw new Error("Invalid form definition.");
        var state = {available: {}, used: {}, count: 0};
        source.questions.forEach(function (question) {state.available["source-" + question.id] = question;});
        var result = {schemaVersion: 1, id: "agent-input-form",
            title: typeof requested.title === "string" ? requested.title.substring(0, 200) : "Additional information needed",
            elements: []};
        if (requested.elements.length === 1 && requested.elements[0].kind === "container") {
            var container = requested.elements[0];
            if (!Array.isArray(container.columns) || container.columns.length < 1 || container.columns.length > 2)
                throw new Error("Choose a one- or two-column layout.");
            var output = {id: "form-layout", kind: "container", name: "input_questions", label: "",
                options: {layout: container.columns.length === 2 ? "2down" : "normal"}, columns: []};
            for (var c = 0; c < container.columns.length; c++) {
                var column = container.columns[c];
                if (!column || !Array.isArray(column.elements)) throw new Error("Invalid column.");
                var elements = [];
                for (var i = 0; i < column.elements.length; i++)
                    elements.push(this._authorField(column.elements[i], state));
                output.columns.push({id: "column-" + c, elements: elements});
            }
            result.elements.push(output);
        } else {
            // Retain compatibility with the previous flat selector definition.
            for (var f = 0; f < requested.elements.length; f++)
                result.elements.push(this._authorField(requested.elements[f], state));
        }
        if (!state.count) throw new Error("Add at least one complete question.");
        return result;
    },

    _authorField: function (element, state) {
        if (!element || element.kind && element.kind !== "field" || typeof element.id !== "string")
            throw new Error("Invalid question.");
        state.count++;
        if (state.count > 100) throw new Error("A form supports at most 100 questions.");
        if (Object.prototype.hasOwnProperty.call(state.used, element.id)) throw new Error("A question was added more than once.");
        state.used[element.id] = true;
        var requested = element.options || {};
        var options = {mandatory: requested.mandatory === true};
        var source = state.available[element.id];
        if (source) {
            if (!source.supported) throw new Error("A selected source question is unavailable.");
            options = JSON.parse(JSON.stringify(source.options));
            options.mandatory = requested.mandatory === true;
            return {id: "source-" + source.id, kind: "field", name: "input_" + source.id,
                fieldType: source.fieldType, label: source.label, options: options};
        }
        if (!/^question_[1-9][0-9]*$/.test(element.id)) throw new Error("A selected source question is unavailable.");
        var allowed = ["singleLineText", "multiLineText", "wideSingleLineText", "yesNo", "checkbox",
            "selectBox", "multipleChoice", "numericScale", "reference", "listCollector", "date", "dateTime",
            "email", "url", "ipAddress", "duration", "masked"];
        if (allowed.indexOf(element.fieldType) < 0) throw new Error("Unsupported new question type.");
        if (typeof element.label !== "string" || !element.label.replace(/\s/g, "") || element.label.length > 200)
            throw new Error("Each new question needs a label of at most 200 characters.");
        if (element.fieldType === "reference" || element.fieldType === "listCollector") {
            if (["sys_user", "sys_user_group", "cmdb_ci"].indexOf(requested.reference) < 0)
                throw new Error("Choose Users, Groups, or Configuration items for the reference.");
            options.reference = requested.reference;
        }
        if (element.fieldType === "numericScale") {
            if (typeof requested.min !== "number" || typeof requested.max !== "number" ||
                !isFinite(requested.min) || !isFinite(requested.max) || requested.min % 1 || requested.max % 1 ||
                requested.max < requested.min || requested.max - requested.min > 1000)
                throw new Error("The numeric scale needs valid integer bounds.");
            options.min = requested.min; options.max = requested.max;
        }
        if (element.fieldType === "selectBox" || element.fieldType === "multipleChoice") {
            if (!Array.isArray(requested.choices) || !requested.choices.length || requested.choices.length > 100)
                throw new Error("Supply between 1 and 100 choices.");
            options.choices = [];
            var values = {};
            for (var c = 0; c < requested.choices.length; c++) {
                var choice = requested.choices[c];
                if (!choice || typeof choice.label !== "string" || !choice.label.replace(/\s/g, "") || choice.label.length > 200 ||
                    typeof choice.value !== "string" || !/^choice_[1-9][0-9]*$/.test(choice.value) || values[choice.value])
                    throw new Error("Each choice needs a label and a unique generated value.");
                values[choice.value] = true;
                options.choices.push({label: choice.label, value: choice.value});
            }
        }
        return {id: element.id, kind: "field", name: element.id, fieldType: element.fieldType,
            label: element.label, options: options};
    },

    _readCatalog: function (ritmId, result, seen) {
        var links = new GlideRecordSecure("sc_item_option_mtom");
        links.addQuery("request_item", ritmId);
        links.query();
        while (links.next()) {
            if (!links.sc_item_option.canRead()) continue;
            var answer = new GlideRecordSecure("sc_item_option");
            if (!answer.get(links.getValue("sc_item_option")) || !answer.item_option_new.canRead()) continue;
            this._appendQuestion(answer.getValue("item_option_new"), result, seen);
        }
    },

    _readRecordProducer: function (task, result, seen) {
        var answers = new GlideRecordSecure("question_answer");
        answers.addQuery("table_sys_id", task.getUniqueValue());
        answers.query();
        while (answers.next()) {
            if (!answers.question.canRead() || !answers.table_name.canRead() || !answers.table_sys_id.canRead()) continue;
            // A stored table may be a parent of the actual record class.
            var storedTable = answers.getValue("table_name");
            if (!storedTable || !task.instanceOf(storedTable)) continue;
            this._appendQuestion(answers.getValue("question"), result, seen);
        }
    },

    _appendQuestion: function (questionId, result, seen) {
        if (seen[questionId]) return;
        // Record-producer variables are also item_option_new definitions;
        // their answer storage differs from catalog request answers.
        var question = new GlideRecordSecure("item_option_new");
        if (!question.get(questionId) || !question.canRead()) return;
        if (!question.read_roles.canRead() || !this._readRoles(question.getValue("read_roles"))) return;
        if (!question.variable_set.canRead()) return;
        var setId = question.getValue("variable_set");
        if (setId) {
            var variableSet = new GlideRecordSecure("item_option_new_set");
            if (!variableSet.get(setId) || !variableSet.canRead() || !variableSet.read_roles.canRead() ||
                !this._readRoles(variableSet.getValue("read_roles"))) return;
        }
        var required = ["name", "question_text", "type", "order", "reference", "list_table",
            "reference_qual", "dynamic_ref_qual", "scale_min", "scale_max"];
        for (var f = 0; f < required.length; f++)
            if (!question.getElement(required[f]).canRead()) return;
        seen[questionId] = true;
        var row = this._question(question);
        row.id = question.getUniqueValue();
        row.order = parseInt(question.getValue("order"), 10) || 0;
        result.questions.push(row);
    },

    _readRoles: function (roles) {
        if (!roles) return true;
        var names = roles.split(",");
        for (var i = 0; i < names.length; i++)
            if (gs.hasRole(names[i].replace(/^\s+|\s+$/g, ""))) return true;
        return false;
    },

    _question: function (record) {
        var mapping = {"1": "yesNo", "2": "multiLineText", "3": "multipleChoice",
            "4": "numericScale", "5": "selectBox", "6": "singleLineText", "7": "checkbox",
            "8": "reference", "9": "date", "10": "dateTime", "16": "wideSingleLineText",
            "21": "listCollector", "25": "masked", "26": "email", "27": "url",
            "28": "ipAddress", "29": "duration"};
        var type = record.getValue("type");
        var row = {label: record.getValue("question_text") || record.getValue("name") || "Untitled question",
            sourceName: record.getValue("name") || "", fieldType: mapping[type] || "",
            options: {}, supported: !!mapping[type], reason: ""};
        if (!row.supported) {
            row.reason = "This source type needs a dedicated conversion before it can be selected.";
            return row;
        }
        // Do not forward source readonly/mandatory settings, scripts, defaults,
        // current answers, catalog identities, or server-side JavaScript.
        if (type === "8" || type === "21") {
            row.options.reference = record.getValue(type === "21" ? "list_table" : "reference");
            if (!row.options.reference || record.getValue("reference_qual") || record.getValue("dynamic_ref_qual")) {
                row.supported = false;
                row.reason = "Reference requires a table and a supported qualifier resolver; qualified sources are not converted yet.";
            }
        }
        if (type === "3" || type === "5") {
            row.options.choices = [];
            var choices = new GlideRecordSecure("question_choice");
            choices.addQuery("question", record.getUniqueValue());
            choices.orderBy("order");
            choices.query();
            while (choices.next()) {
                if (!choices.text.canRead() || !choices.value.canRead()) continue;
                row.options.choices.push({label: choices.getValue("text"), value: choices.getValue("value")});
            }
            if (!row.options.choices.length) {
                row.supported = false;
                row.reason = "No readable static choices are available.";
            }
        }
        if (type === "4") {
            row.options.min = parseInt(record.getValue("scale_min"), 10);
            row.options.max = parseInt(record.getValue("scale_max"), 10);
            if (isNaN(row.options.min) || isNaN(row.options.max) || row.options.max < row.options.min || row.options.max - row.options.min > 1000) {
                row.supported = false;
                row.reason = "The numeric scale bounds are unsupported.";
            }
        }
        return row;
    },
    type: "TaskInputSource"
};
