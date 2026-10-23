# Scripted form model

Current candidate contract for the object assigned to `data.myForm`:

```html
<sp-model form-model="::data.myForm" mandatory="[]"></sp-model>
```

This describes the builder's output before client initialization. It is not a
verified complete ServiceNow contract. No question records or question/item
sys_ids are generated or required by the builder. Native rendering, particularly
reference lookup with name-only identities, still needs instance validation.

## Form

| Property | Shape / current value |
| --- | --- |
| `is_transient` | `true` |
| `client_script` | `{onLoad: [], onChange: [], onSubmit: [], messages: {}}` |
| `policy` | `[]`; required by the supplied catalog policy traversal |
| `ui_scripts` | `[]` |
| `validation_scripts` | `[]` |
| `_fields` | Map of field name to field model |
| `_view` | Ordered array of `{name, type: "field", hashKey?}` |
| `_sections` | Array of layout sections |

## Layout

The builder starts with one section and one column. See the extended API below
for explicit containers, splits, and checkbox grouping.

```javascript
{
    id: "main",
    name: "",
    caption: "",
    type: "container",
    visible: true,
    columns: [{
        fields: [{ name: "single_line_text", type: "field" }]
    }]
}
```

Every field reference must resolve to an `_fields` key. `_view` and section
references describe the same selected fields. Preserve existing `hashKey`
properties on sections, columns, references, and choices when importing models;
their keyboard role is unverified. The builder accepts supplied hash keys for references and layout elements; see
the extended layout options below. It generates no hash keys.

## Common field properties

| Property | Shape / meaning |
| --- | --- |
| `name` | Unique lowercase name matching `^[a-z][a-z0-9_]*$` and its map key |
| `variable_name` | Same as `name`; no `IO:` or record identity |
| `label` | Question label string |
| `type` | Renderer type from the table below |
| `value` | String, defaults to `""` |
| `displayValue` | String, defaults to `""`; provide the display label for an initial reference value |
| `visible` | Boolean, defaults to `true` |
| `mandatory` | Boolean, defaults to `false` |
| `readonly` | Boolean, defaults to `false`; used for behavior |
| `read_only` | Same initial readonly state; used by template CSS |
| `_cat_variable` | Boolean `true`; selects catalog handling and decoration |
| `attributes` | Attribute string, defaults to `""` |
| `placeholder` | String, defaults to `""` |

`read_only` is only initialized alongside `readonly`; synchronization after client
state changes has not been established.

## Field-specific properties

| Builder method | `type` | Additional output |
| --- | --- | --- |
| `singleLineText` | `string` | `_class_name: "TextFieldQuestion"`, `_force_single_line: true` |
| `multiLineText` | `textarea` | `_class_name: "TextAreaQuestion"` |
| `reference` | `reference` | `_class_name: "ReferenceQuestion"`, `refTable`, `readonlyClickthrough: true`, `ed` |
| `yesNo` | `choice` | `_class_name: "YesNoQuestion"`, `choice: 0`, `choices` |

Reference options require `reference` (table name). Optional `searchField`,
`defaultOperator`, and `qualifier` populate:

```javascript
ed: {
    reference: "sys_user",
    searchField: "name",
    defaultOperator: "STARTSWITH",
    qualifier: "",
    name: "reference"
}
```

A selected reference answer can contain an existing target record's sys_id in
`value`; that does not create a persisted question definition.

Yes/no choices are `{label: "Yes", value: "Yes"}` and
`{label: "No", value: "No"}`. Accepted values are `""`, `"Yes"`, and `"No"`.
Its `displayValue` is set to its value.

## Client-generated properties and current reductions

Do not supply `stagedValue`, `isVisible`, `isReadonly`, `isMandatory`, or
`mandatory_filled`: `spModelUtil` generates them. For decorated fields,
`_visible`, `_readonly`, and `_mandatory` are initialized from public flags.

The builder omits guide flags, dynamic-value configuration, `display_value`,
`order`, `unique`, empty regex configuration, and empty lookup settings.
These reductions are candidates pending instance testing. `_class_name`,
reference metadata, and explicit state booleans remain conservative inputs.

No submission or persistence workflow is implemented. Verify text editing,
multiline entry, reference search/selection/clearing, and yes/no changes in a
ServiceNow portal before extending this schema.

## Extended builder API

All field methods take `(name, label, options)` and return the builder. The
widget server script demonstrates the expanded candidate model. All field
identities remain name-only. The following supersedes the earlier four-field
scope and one-column restriction above.

| Method | Renderer | Specific options / metadata |
| --- | --- | --- |
| `wideSingleLineText` | `string` | `_force_single_line: true`, `WideTextFieldQuestion` |
| `html` | `html` | `HTMLQuestion`; editable HTML, not a static label |
| `richTextLabel` | `rich_text_label` | `RichTextLabelQuestion`; `value` holds content (instance verification pending) |
| `ipAddress` | `string` | `IpQuestion`; no IP validator is bundled |
| `date` | `glide_date` | `DateQuestion` |
| `dateTime` | `glide_date_time` | `DateTimeQuestion` |
| `duration` | `glide_duration` | `DurationQuestion` |
| `url` | `url` | `UrlQuestion`; no URL validation script is bundled |
| `email` | `email` | `EmailQuestion`; no email validation script is bundled |
| `label` | `label` | Layout entry includes `label` |
| `breakField` | `break` | Layout entry uses `type: "break"` |
| `selectBox` | `choice` | Required `choices`, `SelectQuestion` |
| `multipleChoice` | `multiple_choice` | Required `choices`, `RadioChoicesQuestion`, optional `choice_direction` |
| `lookupSelectBox` | `choice` | Caller resolves `choices`; optional `lookup_table`, `lookup_value`, `lookup_label`, `qualifier` |
| `lookupMultipleChoice` | `multiple_choice` | Same lookup options; no automatic database query |
| `numericScale` | `numericscale` | Integer `min` / `max`, defaults 0 / 5, at most 1001 choices |
| `masked` | `masked` | `catalog_view_masked: true`, optional `useConfirmation` (validator not bundled) |
| `checkbox` | `boolean` | String value `"true"` / `"false"`; emits a companion checkbox container |
| `listCollector` | `glide_list` | Required `reference`, optional `display_value_list`, search and qualifier options |
| `requestedFor` | `reference` | `RequestedForQuestion`, `is_requested_for: true`, table `sys_user`; candidate integration only |
| `custom` | `widget` | Required `widget` model containing `template`, `MacroQuestion` |
| `customWithLabel` | `widget` | Same widget requirement, `MacroWithLabelQuestion` |
| `attachment` | `sc_attachment` | Builder constructor requires `attachmentGuid`; optional `maxFileSize` (MB), `allowedExtensions` |

Choice objects require string `label` and a `value` converted to string. Existing
choice `hashKey` properties are retained. Initial selection is derived from the
field value; values outside the choices and duplicate values are rejected.
Choices are copied before normalization. Lookup methods do not evaluate server
JavaScript qualifiers or fetch records: supply authorized, resolved choices.

### Containers and splits

```javascript
builder
    .containerStart("details", "Details", {displayTitle: true})
    .singleLineText("summary", "Summary")
    .containerSplit()
    .multiLineText("description", "Description")
    .containerEnd();
```

`containerStart(name, label, options)` creates a `container_start` field, a
section with columns, and a `_view` entry with nested `variables`. Child fields
receive `_parent`; the container records `_children`. `containerSplit(options)`
adds a column (maximum 12). The template derives widths from column count; use
2, 3, 4, 6, or 12 columns for integral Bootstrap widths. `containerEnd()` resumes
an ordinary section. Splits and ends are layout operations, not fake questions.
Nested explicit containers are rejected for now. Building with an unclosed
container or splitting/ending outside one throws.

Container options accept `hashKey` for the section and `columnHashKey` for the
first column. Split options accept `hashKey` for the new column. Field options
continue to accept `hashKey` for references.

Each checkbox gets a companion `checkbox_container` named
`checkbox_group_<name>`. That name is reserved once generated. Its `_children`,
child `_parent`, nested `_view.variables`, and layout `containers` mirror the
native grouping structure. When placed in an explicit container, the group is
its child and the checkbox is the group's child.

### Integration boundaries

These are generated model shapes, not verified end-to-end variable support.
Local tests exercise generation only. Portal checks are still required for all
new renderers, checkbox mandatory/visibility behavior, container propagation,
and columns. Native reference, list, radio, and Requested For
components may still depend on record identities or other metadata.

Requested For access validation is explicitly disabled (`validate_on_change:
false`) because the native validation path uses the catalog item identity.
Additional-recipient behavior is disabled. This is not full Requested For parity.

The original model included validation scripts for IP, dates, email, URL, and
masked confirmation. This builder does not bundle those scripts or their UI
script dependencies; rendering these fields does not establish validation.

Attachment uploads inherently persist `sys_attachment` records. The builder
never creates them itself, but enabling the native control is outside a strictly
non-persistent workflow. Supply an authorized temporary target GUID only when
that behavior is intended. Upload/delete functionality without persisted
question metadata is unverified.

Run local generation checks with `node tests/builder.test.js`.

The widget example creates a temporary attachment target with `gs.generateGUID()`
and includes an Attachment field (20 MB maximum, no extension restriction).
The GUID is created on each server execution; preserve it explicitly if adding
server-update flows. No question or catalog item is inserted. Uploads still
persist attachment records. Table Name and UI Page are excluded from the API.
