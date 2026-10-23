// Server-side Script Include: ScriptedFormDefinition. Client callable: false.
// Converts an authored JSON definition to a model through the builder's public API.
var ScriptedFormDefinition = Class.create();
ScriptedFormDefinition.prototype = {
    initialize: function () {},

    build: function (input, runtimeOptions) {
        var definition;
        try {
            definition = typeof input === "string" ? JSON.parse(input) :
                JSON.parse(JSON.stringify(input));
        } catch (error) {
            throw new Error("definition: expected a JSON object or valid JSON string");
        }
        this._object(definition, "definition");
        this._keys(definition, ["schemaVersion", "id", "title", "elements", "scripts", "editor"], "definition");
        if (definition.schemaVersion !== 1) this._fail("schemaVersion", "expected 1");
        this._string(definition.id, "id");
        if (definition.title !== undefined) this._string(definition.title, "title", true);
        if (definition.editor !== undefined) this._object(definition.editor, "editor");
        if (!Array.isArray(definition.elements)) this._fail("elements", "expected an array");

        // All validation state is per call, so an adapter can be reused safely.
        var state = {ids: {}, names: {}, fieldNames: {}};
        this._reserveId(definition.id, "id", state);
        this._validateElements(definition.elements, "elements", false, state);
        this._validateScripts(definition.scripts === undefined ? [] : definition.scripts, state);

        var builder = new ScriptedFormBuilder(runtimeOptions || {});
        this._emitElements(builder, definition.elements);
        var scripts = definition.scripts === undefined ? [] : definition.scripts;
        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            builder.clientScript(script.type, script.name, script.source,
                {fieldName: script.fieldName || ""});
        }
        return builder.build();
    },

    _fieldTypes: function () {
        // Explicit dispatch: JSON cannot invoke arbitrary builder methods.
        return ["singleLineText", "wideSingleLineText", "multiLineText", "reference",
            "yesNo", "html", "richTextLabel", "ipAddress", "date", "dateTime",
            "duration", "url", "email", "label", "breakField", "selectBox",
            "multipleChoice", "lookupSelectBox", "lookupMultipleChoice", "numericScale",
            "masked", "checkbox", "requestedFor", "listCollector", "custom",
            "customWithLabel", "attachment"];
    },

    _validateElements: function (elements, path, inContainer, state) {
        for (var i = 0; i < elements.length; i++) {
            var node = elements[i];
            var at = path + "[" + i + "]";
            this._object(node, at);
            this._reserveId(node.id, at + ".id", state);
            this._reserveName(node.name, at + ".name", state);
            this._string(node.label, at + ".label", true);
            if (node.editor !== undefined) this._object(node.editor, at + ".editor");
            if (node.kind === "field") {
                this._keys(node, ["id", "kind", "name", "label", "fieldType", "options", "editor"], at);
                if (this._fieldTypes().indexOf(node.fieldType) < 0)
                    this._fail(at + ".fieldType", "unsupported field type");
                state.fieldNames[node.name] = true;
                if (node.fieldType === "checkbox")
                    this._reserveName("checkbox_group_" + node.name, at + ".name (generated checkbox group)", state);
                this._validateOptions(node.options === undefined ? {} : node.options, at + ".options", false);
            } else if (node.kind === "container") {
                this._keys(node, ["id", "kind", "name", "label", "options", "columns", "editor"], at);
                if (inContainer) this._fail(at, "nested containers are not supported by the builder");
                this._validateOptions(node.options === undefined ? {} : node.options, at + ".options", true);
                if (!Array.isArray(node.columns) || !node.columns.length || node.columns.length > 12)
                    this._fail(at + ".columns", "expected 1 to 12 columns");
                for (var c = 0; c < node.columns.length; c++) {
                    var column = node.columns[c];
                    var cp = at + ".columns[" + c + "]";
                    this._object(column, cp);
                    this._keys(column, ["id", "elements", "hashKey", "editor"], cp);
                    this._reserveId(column.id, cp + ".id", state);
                    if (column.hashKey !== undefined) this._string(column.hashKey, cp + ".hashKey", true);
                    if (column.editor !== undefined) this._object(column.editor, cp + ".editor");
                    if (!Array.isArray(column.elements)) this._fail(cp + ".elements", "expected an array");
                    this._validateElements(column.elements, cp + ".elements", true, state);
                }
            } else {
                this._fail(at + ".kind", "expected field or container");
            }
        }
    },

    _validateOptions: function (options, path, container) {
        this._object(options, path);
        var strings = container ? ["layout", "hashKey"] :
            ["displayValue", "attributes", "placeholder", "hashKey", "reference", "searchField",
                "defaultOperator", "qualifier", "choice_direction", "lookup_table", "lookup_value",
                "lookup_label", "allowedExtensions", "help_text"];
        var booleans = container ? ["visible", "mandatory", "readonly", "displayTitle"] :
            ["visible", "mandatory", "readonly", "useConfirmation"];
        var extras = container ? [] : ["value", "choices", "min", "max", "maxFileSize", "widget", "display_value_list"];
        this._keys(options, strings.concat(booleans, extras), path);
        var i;
        for (i = 0; i < strings.length; i++)
            if (options[strings[i]] !== undefined) this._string(options[strings[i]], path + "." + strings[i], true);
        for (i = 0; i < booleans.length; i++)
            if (options[booleans[i]] !== undefined && typeof options[booleans[i]] !== "boolean")
                this._fail(path + "." + booleans[i], "expected a boolean");
        if (options.value !== undefined && options.value !== null &&
            ["string", "number", "boolean"].indexOf(typeof options.value) < 0)
            this._fail(path + ".value", "expected a scalar value");
        var numbers = ["min", "max", "maxFileSize"];
        for (i = 0; i < numbers.length; i++)
            if (options[numbers[i]] !== undefined && (typeof options[numbers[i]] !== "number" || !isFinite(options[numbers[i]])))
                this._fail(path + "." + numbers[i], "expected a finite number");
        if (options.choices !== undefined) {
            if (!Array.isArray(options.choices)) this._fail(path + ".choices", "expected an array");
            for (i = 0; i < options.choices.length; i++) {
                var choice = options.choices[i];
                this._object(choice, path + ".choices[" + i + "]");
                this._keys(choice, ["id", "label", "value", "hashKey"], path + ".choices[" + i + "]");
                this._string(choice.label, path + ".choices[" + i + "].label", true);
                this._string(choice.value, path + ".choices[" + i + "].value", true);
                if (choice.id !== undefined) this._string(choice.id, path + ".choices[" + i + "].id");
                if (choice.hashKey !== undefined) this._string(choice.hashKey, path + ".choices[" + i + "].hashKey", true);
            }
        }
        if (options.widget !== undefined) this._object(options.widget, path + ".widget");
        if (options.display_value_list !== undefined && !Array.isArray(options.display_value_list))
            this._fail(path + ".display_value_list", "expected an array");
    },

    _validateScripts: function (scripts, state) {
        if (!Array.isArray(scripts)) this._fail("scripts", "expected an array");
        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            var path = "scripts[" + i + "]";
            this._object(script, path);
            this._keys(script, ["id", "type", "name", "source", "fieldName", "editor"], path);
            this._reserveId(script.id, path + ".id", state);
            this._string(script.name, path + ".name");
            this._string(script.source, path + ".source");
            if (["onLoad", "onChange", "onSubmit"].indexOf(script.type) < 0)
                this._fail(path + ".type", "unsupported script type");
            if (script.editor !== undefined) this._object(script.editor, path + ".editor");
            if (script.fieldName !== undefined) this._string(script.fieldName, path + ".fieldName", true);
            if (script.type === "onChange" && !Object.prototype.hasOwnProperty.call(state.fieldNames, script.fieldName))
                this._fail(path + ".fieldName", "onChange must reference a defined field name");
        }
    },

    _emitElements: function (builder, elements) {
        for (var i = 0; i < elements.length; i++) {
            var node = elements[i];
            try {
                if (node.kind === "field") {
                    builder[node.fieldType](node.name, node.label, node.options === undefined ? {} : node.options);
                } else {
                    var options = node.options === undefined ? {} : node.options;
                    if (node.columns[0].hashKey !== undefined) options.columnHashKey = node.columns[0].hashKey;
                    builder.containerStart(node.name, node.label, options);
                    for (var c = 0; c < node.columns.length; c++) {
                        if (c) builder.containerSplit({hashKey: node.columns[c].hashKey});
                        this._emitElements(builder, node.columns[c].elements);
                    }
                    builder.containerEnd();
                }
            } catch (error) {
                throw new Error("Element " + node.id + " (" + node.name + "): " + error.message);
            }
        }
    },

    _reserveId: function (id, path, state) {
        this._string(id, path);
        if (Object.prototype.hasOwnProperty.call(state.ids, id)) this._fail(path, "duplicate editor id: " + id);
        Object.defineProperty(state.ids, id, {value: true, enumerable: true});
    },
    _reserveName: function (name, path, state) {
        if (typeof name !== "string" || !/^[a-z][a-z0-9_]*$/.test(name))
            this._fail(path, "expected a lowercase field name");
        if (Object.prototype.hasOwnProperty.call(state.names, name)) this._fail(path, "duplicate runtime name: " + name);
        state.names[name] = true;
    },
    _object: function (value, path) {
        if (!value || typeof value !== "object" || Array.isArray(value)) this._fail(path, "expected an object");
    },
    _string: function (value, path, emptyAllowed) {
        if (typeof value !== "string" || (!emptyAllowed && !value.replace(/\s/g, "")))
            this._fail(path, "expected " + (emptyAllowed ? "a string" : "a nonempty string"));
    },
    _keys: function (object, allowed, path) {
        for (var key in object)
            if (Object.prototype.hasOwnProperty.call(object, key) && allowed.indexOf(key) < 0)
                this._fail(path + "." + key, "unknown property");
    },
    _fail: function (path, message) { throw new Error(path + ": " + message); },
    type: "ScriptedFormDefinition"
};
