# Classic task input-form designer

The agent opens this page in a Classic form modal using the UI Action in
`ui-actions/`. The same page can also be opened directly with
`/request_input_builder.do?sysparm_task_id=<task sys_id>`.

## Build a form

1. The page opens with an empty one-column form skeleton.
2. Choose **One column** or **Two columns**.
3. Click **+ Add question** at the end of a column. The inline panel offers
   **From variable** and **New question**.
4. Either choice appends a card at the end of that column:
   - **From variable:** select a readable, supported task variable. Existing
     answers are never copied. Unsupported choices are disabled with a reason.
   - **New question:** choose a type and enter a label. Configure choices,
     reference target, or numeric bounds when relevant. Check **Required** if needed.
5. Move cards up/down or between columns, or remove them. Switching to one column
   appends all right-column cards after the left-column cards without losing them.
6. Complete every card, then click **Preview form**. The iframe loads only then.
   Later changes require **Update preview**; edits never reload it automatically.

New-question types currently include text, multiline text, yes/no, checkbox,
select box, multiple choice, numeric scale, reference, list collector, date,
date/time, email, URL, IP address, duration, masked, and wide text. Choice values
are generated automatically. New reference/list targets are currently Users,
Groups, or Configuration items. Custom widget/script/HTML authoring and upload
questions are not offered by this GUI. The general builder's validation and
native-field limitations still apply; this is not full native catalog parity.

The Advanced disclosure contains generated JSON for troubleshooting; agents do
not need to understand it. Its output element (`generated-definition`), the
question counter, and context summary are optional; omitting them from a
customized modal template does not block editing or preview. Incomplete cards are excluded from that output and
block preview. Drafts are in memory and are lost when the modal closes.

## Install in a development instance

1. Install server-only Script Includes `TaskInputSource`, `ScriptedFormBuilder`,
   and `ScriptedFormDefinition`, with Client callable disabled.
2. Create/update non-public UI Page `request_input_builder`: use `template.xml`
   as HTML and `client.js` as Client script. Restrict the UI Page ACL to agents.
3. Install the one widget from `widget/server.js`, `widget/client.js`, and
   `widget/template.html`. Put it on ESC page `newpage` (temporary page ID).
4. Install the Classic UI Action as described in `ui-actions/README.md`.
5. Open a saved, editable task in Classic and click **Request additional input**.

The UI Page reads the task ID from the modal preference or URL parameter. The
preview uses `/esc?id=newpage&table=<actual task table>&sys_id=<task sys_id>&sysparm_scripted_preview=true`.
Change `newpage` in `template.xml` later. The actual task table is resolved
server-side, for example `incident` or `sc_task`. Verify instance framing policy
permits the portal iframe. No Workspace launcher is implemented.

## Variable sources and context

The original task remains the interaction context; variable storage is separate:

- `sc_task` and subclasses: follow `request_item` to the RITM and read
  `sc_item_option_mtom` / `sc_item_option`.
- `sc_req_item` directly: read its catalog variable relationships.
- Other task classes: read record-producer `question_answer` rows matching the
  task ID and compatible table hierarchy.

Question definitions are resolved through `item_option_new`. The service uses
`GlideRecordSecure`, checks the actual task subclass's read/write access, source
reference and metadata field access, and question/variable-set read roles.
Custom variable stores, multi-row sets, and questions without stored-answer
relationships are not included. Qualified references are disabled pending a
qualifier resolver; their constraints are not silently discarded.

`TaskInputSource` is the single task service. Remove the old `RequestInputSource`
wrapper after migrating any external callers. Its new
`buildDefinition(taskId, requested)` method re-authorizes the task, resolves
source IDs authoritatively, and accepts only the GUI's supported non-executable
new-question settings. It supports one/two columns and up to 100 questions.
Browser source types, labels, choices, scripts, and defaults are not trusted.
Only the Required flag can override a source question's initial configuration.
New questions have generated names, validated labels and choices, no script
sources, and no initial answers. A definition is passed to the existing JSON
adapter; `ScriptedFormBuilder` is unchanged by this UI work.

Same-origin preview messages also verify the sender window. The preview uses the
agent's session; it is not end-user impersonation. It permits field interaction
but disables Save. Normal widget mode retains the local-only Save placeholder.
No original variables are updated. No definitions, responses, notifications, or
end-user links are persisted or sent yet.

## Checks

Local commands:

- `node tests/ui-page.test.js`
- `node tests/classic-ui-action.test.js`
- `node tests/request-input.test.js`
- `node tests/widget-client.test.js`
- `node tests/builder.test.js`
- `node tests/definition.test.js`

These check generated models, configuration filtering, client interactions, and
modal API calls with mocks. ServiceNow instance validation is still required:
modal preferences and lifecycle, ACL parity, Jelly rendering, Bootstrap layout,
keyboard/focus behavior, portal framing, and native field functionality.

Test an editable catalog task, a record-producer task, a task without variables
(new-question authoring should still work), a read-only task, and an unauthorized
task. Exercise both layouts, adding/configuring both question origins, choices,
references, movement, merging columns, removal, repeated previews, and reopening
the modal. Verify source answers remain unchanged.
