// Server-side Script Include: ScriptedFormBuilder. Client callable: false.
// Creates an in-memory candidate sp-model; does not persist question records.
var ScriptedFormBuilder = Class.create();

ScriptedFormBuilder.prototype = {
    initialize: function (options) {
        options = options || {};
        this._model = {
            is_transient: true,
            client_script: {
                onLoad: [],
                onChange: [],
                onSubmit: [],
                messages: {}
            },
            policy: [],
            ui_scripts: [],
            validation_scripts: [],
            _fields: {},
            _view: [],
            _sections: [{
                id: "main",
                name: "",
                caption: "",
                type: "container",
                visible: true,
                columns: [{ fields: [] }]
            }]
        };
        if (options.attachmentGuid)
            this._model._attachmentGUID = options.attachmentGuid;
    },

    // Layout state is separate from the serialized model.
    _newSection: function () {
        return {id: "section_" + this._model._sections.length, name: "", caption: "",
            type: "container", visible: true, columns: [{fields: []}]};
    },

    containerStart: function (name, label, options) {
        options = options || {};
        if (this._container)
            throw new Error("Nested containers are not supported yet");
        var field = this._createField(name, label, "container_start", options);
        field._children = [];
        field._cascade_hidden = false;
        this._model._fields[name] = field;
        var section = this._newSection();
        section.id = section.name = name;
        section.caption = options.displayTitle ? label : "";
        if (options.hashKey !== undefined) section.hashKey = options.hashKey;
        if (options.columnHashKey !== undefined) section.columns[0].hashKey = options.columnHashKey;
        this._model._sections.push(section);
        var entry = {name: name, type: "container_start", variables: [],
            display_title: options.displayTitle === true, question_text: label};
        this._model._view.push(entry);
        this._container = {field: field, section: section, view: entry};
        return this;
    },

    containerSplit: function (options) {
        options = options || {};
        if (!this._container) throw new Error("Container split requires an open container");
        var columns = this._container.section.columns;
        if (columns.length >= 12) throw new Error("A container supports at most 12 columns");
        var column = {fields: []};
        if (options.hashKey !== undefined) column.hashKey = options.hashKey;
        columns.push(column);
        // Splits are represented by layout columns; no question record is needed.
        return this;
    },

    containerEnd: function () {
        if (!this._container) throw new Error("No open container to end");
        this._container = null;
        this._model._sections.push(this._newSection());
        return this;
    },

    singleLineText: function (name, label, options) {
        var field = this._createField(name, label, "string", options);
        field._class_name = "TextFieldQuestion";
        field._force_single_line = true;
        return this._addField(field, options);
    },

    multiLineText: function (name, label, options) {
        var field = this._createField(name, label, "textarea", options);
        field._class_name = "TextAreaQuestion";
        return this._addField(field, options);
    },

    reference: function (name, label, options) {
        options = options || {};
        if (!options.reference)
            throw new Error("Reference table is required for: " + name);

        var field = this._createField(name, label, "reference", options);
        field._class_name = "ReferenceQuestion";
        field.refTable = options.reference;
        field.readonlyClickthrough = true;
        field.ed = {
            reference: options.reference,
            searchField: options.searchField || "name",
            defaultOperator: options.defaultOperator || "STARTSWITH",
            qualifier: options.qualifier || "",
            name: name
        };
        return this._addField(field, options);
    },

    yesNo: function (name, label, options) {
        var field = this._createField(name, label, "choice", options);
        field._class_name = "YesNoQuestion";
        field.choice = 0;
        field.choices = [
            { label: "Yes", value: "Yes" },
            { label: "No", value: "No" }
        ];
        if (field.value !== "" && field.value !== "Yes" && field.value !== "No")
            throw new Error("Yes / No value must be Yes, No, or empty: " + name);

        field.displayValue = field.value;
        return this._addField(field, options);
    },

    _simple: function (name, label, renderer, className, options) {
        var field = this._createField(name, label, renderer, options);
        if (className) field._class_name = className;
        if (options && options.help_text) field.help_text = options.help_text;
        return this._addField(field, options);
    },

    wideSingleLineText: function (name, label, options) {
        var field = this._createField(name, label, "string", options);
        field._class_name = "WideTextFieldQuestion";
        field._force_single_line = true;
        return this._addField(field, options);
    },

    html: function (name, label, options) {
        return this._simple(name, label, "html", "HTMLQuestion", options);
    },

    richTextLabel: function (name, label, options) {
        return this._simple(name, label, "rich_text_label", "RichTextLabelQuestion", options);
    },

    ipAddress: function (name, label, options) {
        return this._simple(name, label, "string", "IpQuestion", options);
    },

    date: function (name, label, options) {
        return this._simple(name, label, "glide_date", "DateQuestion", options);
    },

    dateTime: function (name, label, options) {
        return this._simple(name, label, "glide_date_time", "DateTimeQuestion", options);
    },

    duration: function (name, label, options) {
        return this._simple(name, label, "glide_duration", "DurationQuestion", options);
    },

    url: function (name, label, options) {
        return this._simple(name, label, "url", "UrlQuestion", options);
    },

    email: function (name, label, options) {
        return this._simple(name, label, "email", "EmailQuestion", options);
    },

    label: function (name, label, options) {
        return this._simple(name, label, "label", "", options);
    },

    breakField: function (name, label, options) {
        return this._simple(name, label, "break", "", options);
    },

    _choice: function (name, label, renderer, className, options) {
        options = options || {};
        if (!Array.isArray(options.choices)) throw new Error("Supply choices for: " + name);
        var field = this._createField(name, label, renderer, options);
        field._class_name = className;
        field.choice = renderer === "choice" ? 1 : 0;
        field.choices = JSON.parse(JSON.stringify(options.choices));
        var seen = {};
        field.choices.forEach(function (choice) {
            if (choice.value == null || typeof choice.label !== "string")
                throw new Error("Each choice requires a label and value");
            choice.value = String(choice.value);
            if (Object.prototype.hasOwnProperty.call(seen, choice.value))
                throw new Error("Duplicate choice value: " + choice.value);
            seen[choice.value] = true;
            choice.selected = choice.value === field.value;
            if (choice.selected) field.displayValue = choice.label;
        });
        if (field.value && !Object.prototype.hasOwnProperty.call(seen, field.value))
            throw new Error("Initial value is not a supplied choice: " + name);
        if (renderer !== "choice") field.choice_direction = options.choice_direction || "down";
        if (options.lookup_table) {
            field.lookup_table = options.lookup_table;
            field.lookup_value = options.lookup_value || "sys_id";
            field.lookup_label = options.lookup_label || "";
            field.reference_qual = options.qualifier || "";
        }
        return this._addField(field, options);
    },

    selectBox: function (name, label, options) {
        return this._choice(name, label, "choice", "SelectQuestion", options);
    },
    multipleChoice: function (name, label, options) {
        return this._choice(name, label, "multiple_choice", "RadioChoicesQuestion", options);
    },
    lookupSelectBox: function (name, label, options) {
        return this._choice(name, label, "choice", "LookupSelectQuestion", options);
    },
    lookupMultipleChoice: function (name, label, options) {
        return this._choice(name, label, "multiple_choice", "LookupRadioQuestion", options);
    },
    numericScale: function (name, label, options) {
        options = JSON.parse(JSON.stringify(options || {}));
        var min = options.min == null ? 0 : options.min;
        var max = options.max == null ? 5 : options.max;
        if (typeof min !== "number" || typeof max !== "number" ||
            !isFinite(min) || !isFinite(max) || min % 1 || max % 1 || max < min || max - min > 1000)
            throw new Error("Scale requires integer bounds with at most 1001 choices");
        options.choices = [];
        for (var i = min; i <= max; i++) options.choices.push({label: String(i), value: String(i)});
        return this._choice(name, label, "numericscale", "LikertScaleQuestion", options);
    },

    masked: function (name, label, options) {
        options = options || {};
        var field = this._createField(name, label, "masked", options);
        field._class_name = "MaskedQuestion";
        field.catalog_view_masked = true;
        field.useConfirmation = options.useConfirmation === true;
        // Confirmation requires a matching validator supplied by the caller.
        return this._addField(field, options);
    },

    checkbox: function (name, label, options) {
        options = options || {};
        var field = this._createField(name, label, "boolean", options);
        if (options.value == null) field.value = "false";
        if (field.value !== "true" && field.value !== "false")
            throw new Error("Checkbox value must be true or false: " + name);
        field._class_name = "CheckBoxQuestion";
        var groupName = "checkbox_group_" + name;
        var group = this._createField(groupName, "", "checkbox_container", options);
        group.render_label = false;
        group._children = [name];
        field._parent = groupName;
        if (this._container) {
            group._parent = this._container.field.name;
            this._container.field._children.push(groupName);
        }
        this._model._fields[name] = field;
        this._model._fields[groupName] = group;
        var child = {name: name, type: "field"};
        if (options.hashKey !== undefined) child.hashKey = options.hashKey;
        var entry = {name: groupName, type: "checkbox_container", variables: [child],
            containers: [{name: groupName, id: groupName, caption: "", type: "container",
                columns: [{fields: [child]}]}]};
        if (this._container) this._container.view.variables.push(entry);
        else this._model._view.push(entry);
        var section = this._container ? this._container.section :
            this._model._sections[this._model._sections.length - 1];
        section.columns[section.columns.length - 1].fields.push(entry);
        return this;
    },

    requestedFor: function (name, label, options) {
        options = JSON.parse(JSON.stringify(options || {}));
        options.reference = "sys_user";
        this.reference(name, label, options);
        var field = this._model._fields[name];
        field._class_name = "RequestedForQuestion";
        field.is_requested_for = true;
        field.also_request_for = false;
        // Native item-access validation needs a persisted catalog item.
        field.validate_on_change = false;
        this._model.has_requested_for_variable = true;
        this._model.requested_for_variable_name = name;
        return this;
    },

    listCollector: function (name, label, options) {
        options = options || {};
        if (!options.reference) throw new Error("Reference table is required for: " + name);
        var field = this._createField(name, label, "glide_list", options);
        field._class_name = "ListCollectorQuestion";
        field.refTable = field.table = options.reference;
        field.display_value_list = options.display_value_list || [];
        field.ed = {reference: options.reference, searchField: options.searchField || "name",
            defaultOperator: options.defaultOperator || "STARTSWITH", qualifier: options.qualifier || "", name: name};
        return this._addField(field, options);
    },

    custom: function (name, label, options) {
        return this._widget(name, label, "MacroQuestion", options);
    },
    customWithLabel: function (name, label, options) {
        return this._widget(name, label, "MacroWithLabelQuestion", options);
    },
    _widget: function (name, label, className, options) {
        options = options || {};
        if (!options.widget || !options.widget.template)
            throw new Error("Supply a widget model with a template for: " + name);
        var field = this._createField(name, label, "widget", options);
        field._class_name = className;
        field.widget = JSON.parse(JSON.stringify(options.widget));
        return this._addField(field, options);
    },

    attachment: function (name, label, options) {
        options = options || {};
        if (!this._model._attachmentGUID)
            throw new Error("Attachment requires attachmentGuid; uploads persist attachment records");
        var field = this._createField(name, label, "sc_attachment", options);
        field._class_name = "AttachmentQuestion";
        field.attributes = {max_file_size: String(options.maxFileSize || 20),
            allowed_extensions: options.allowedExtensions || ""};
        field.content_type = field.state = field.file_name = "";
        field.enableDeleteAttachment = true;
        return this._addField(field, options);
    },

    build: function () {
        if (this._container) throw new Error("Close the container before building");
        var model = JSON.parse(JSON.stringify(this._model));
        model._sections = model._sections.filter(function (section) {
            return section.name || section.columns.some(function (column) { return column.fields.length; });
        });
        return model;
    },

    _createField: function (name, label, fieldType, options) {
        options = options || {};
        if (!/^[a-z][a-z0-9_]*$/.test(name || ""))
            throw new Error("Invalid scripted field name: " + name);
        if (Object.prototype.hasOwnProperty.call(this._model._fields, name))
            throw new Error("Duplicate scripted field name: " + name);

        return {
            name: name,
            variable_name: name,
            label: label,
            type: fieldType,
            value: options.value == null ? "" : String(options.value),
            displayValue: options.displayValue == null ? "" : String(options.displayValue),
            visible: options.visible !== false,
            mandatory: options.mandatory === true,
            readonly: options.readonly === true,
            read_only: options.readonly === true,
            _cat_variable: true,
            attributes: options.attributes || "",
            placeholder: options.placeholder || ""
        };
    },

    _addField: function (field, options) {
        options = options || {};
        this._model._fields[field.name] = field;
        var viewEntry = { name: field.name, type: "field" };
        var layoutEntry = { name: field.name, type: "field" };
        if (options.hashKey !== undefined) {
            viewEntry.hashKey = options.hashKey;
            layoutEntry.hashKey = options.hashKey;
        }
        if (field.type === "label") {
            viewEntry.type = layoutEntry.type = "label";
            viewEntry.label = layoutEntry.label = field.label;
        } else if (field.type === "break") {
            viewEntry.type = layoutEntry.type = "break";
        }
        if (this._container) {
            this._container.view.variables.push(viewEntry);
            this._container.field._children.push(field.name);
            field._parent = this._container.field.name;
        } else {
            this._model._view.push(viewEntry);
        }
        var section = this._container ? this._container.section :
            this._model._sections[this._model._sections.length - 1];
        section.columns[section.columns.length - 1].fields.push(layoutEntry);
        return this;
    },

    type: "ScriptedFormBuilder"
};
