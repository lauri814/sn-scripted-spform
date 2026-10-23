# Authored form definition, version 1

`ScriptedFormDefinition.build(definition, runtimeOptions)` accepts a JSON string
or a parsed JSON object and returns the object for `sp-model`. It delegates only
to public `ScriptedFormBuilder` methods. Install both server-side Script Includes
with Client callable disabled. No records are inserted. Existing builder and
portal limitations remain; see [form-model.md](form-model.md).

```javascript
// Widget server script; definition is an authored object or JSON string.
var adapter = new ScriptedFormDefinition();
data.myForm = adapter.build(definition);
// If the definition contains an attachment field:
// data.myForm = adapter.build(definition, {attachmentGuid: gs.generateGUID()});
```

A complete definition is in [../examples/form-definition.json](../examples/form-definition.json).
The machine-readable structure is [form-definition.schema.json](form-definition.schema.json).
The existing widget demo is unchanged.

## Editor-oriented structure

- `schemaVersion: 1` is required. Unknown versions are rejected for future migrations.
- `id` is a stable editor identifier for the form, nodes, columns, and scripts.
  These IDs are arbitrary nonempty strings, not ServiceNow sys_ids. Preserve them
  when moving or renaming elements; allocate new IDs when duplicating them.
- `name` is the runtime field/container identity used by `g_form`. It must match
  `^[a-z][a-z0-9_]*$` and be globally unique, including generated checkbox groups.
  Changing a name requires updating script references. Editor IDs are independent.
- `title` is optional descriptive editor metadata, not a generated section caption.
- `elements` is the ordered top-level list of fields and containers. Array order
  defines placement; no redundant numeric order property is needed.
- Containers contain ordered `columns`, each with ordered `elements`. A future UI
  can move nodes between these arrays without constructing split/end markers.
  The adapter calls `containerSplit()` between columns and closes each container.
- Nested explicit containers are rejected until the builder supports them. There
  must be 1–12 columns; empty columns are allowed as editor drop targets.
- Optional `editor` objects on the form, nodes, columns, and scripts hold future
  editor-only settings. They do not enter the runtime model.
- Existing `hashKey` values can be supplied in field/container options, on columns,
  or on choices. IDs do not replace or manufacture hash keys.

Field nodes use `kind: "field"`, `fieldType` (a whitelisted public builder method),
`name`, `label`, and optional `options`. The adapter supports every current field
method; Table Name and UI Page remain excluded. See the runtime schema's API table
for each method's options. Shared option types are checked; field-specific
requirements and initial choice validation are delegated to the builder. Do not
supply unrelated options: the builder may ignore them.

Container nodes use `kind: "container"`, `name`, `label`, optional `options`, and
`columns`. Options include `layout` (default `normal`), `displayTitle`, state
booleans, and `hashKey`. Column `hashKey` is mapped to the builder's initial-column
or split option. `layout: "2down"` preserves the observed native metadata;
column placement still follows the arrays.

## Scripts and runtime context

Optional `scripts` entries contain `id`, `name`, `type`, and `source` (the complete
function declaration as a string). `onChange` also requires `fieldName` matching
a defined field. No script records or script IDs are created in ServiceNow.
Source is not executed by the adapter. Use trusted authored definitions: script
and widget source will execute in the portal; this API is not a sandbox for
arbitrary end-user JSON. No client-callable endpoint is added.

Transient attachment target GUIDs belong in the separate `runtimeOptions`, not
in the saved definition. The caller manages their lifetime across updates.
Attachments still persist upload records. References and lookups retain their
existing native integration limits. Lookup choices must be resolved by the caller.

## Validation and output

Unknown structural properties, methods, versions, duplicate IDs/names, malformed
option types, and unknown onChange field targets are rejected. Choice IDs are
optional editor identifiers and should be unique within their field. JSON Schema
validates structure; cross-element uniqueness and relationships are enforced by
the adapter. Builder errors identify the offending element ID and name.

The adapter copies input, does not mutate the definition, and returns only the
builder's runtime model. Editor metadata and node IDs are not copied into that
model (choice IDs remain in copied choice objects). No GUI, persistence layer,
code execution endpoint, or schema migration is implemented yet.

Run `node tests/definition.test.js` and `node tests/builder.test.js` locally.
