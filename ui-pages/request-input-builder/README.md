# Agent selector from any task

The entry point is any record extending `task`. The original task remains the
interaction context for agent and eventual end-user flows. Variable storage is
resolved separately:

- `sc_task` (including subclasses): follow `request_item` to `sc_req_item`, then
  read `sc_item_option_mtom` / `sc_item_option` relationships.
- `sc_req_item` itself: read its catalog variable relationships directly.
- Other task classes: read record-producer answers from `question_answer`, using
  `table_sys_id` and checking that `table_name` belongs to the actual task's class
  hierarchy. Tasks without stored questions produce an empty selectable list.

Both paths resolve question definitions through `item_option_new`. Custom
variable stores and multi-row sets are not supported by these readers yet.
 The agent selects questions and clicks
**Preview form**; the page builds version-1 JSON automatically. JSON is shown only
inside the optional Advanced disclosure. Selection order determines field order.
Questions start blank; existing source answers are never returned to this page.

## Install in a development instance

1. Install server-only Script Includes `TaskInputSource`, `ScriptedFormBuilder`,
   and `ScriptedFormDefinition`, with Client callable disabled.
2. Create a non-public UI Page named `request_input_builder`. Copy `template.xml`
   into HTML and `client.js` into Client script. Configure the UI Page's read ACL
   for the intended agent audience. The source service additionally requires
   read/write access to the actual task subclass and read access to the resolved variable owner.
3. Install the single widget from `widget/server.js`, `widget/client.js`, and
   `widget/template.html`. Place an instance on a portal page with ID
   `newpage` in `/esc`. The same widget supports both normal and preview use;
   no separate preview widget is needed.
4. Open `/request_input_builder.do?sysparm_task_id=<task record sys_id>` as an agent.
   The preview iframe uses `/esc?id=newpage&table=<actual_task_table>&sys_id=<task_sys_id>&sysparm_scripted_preview=true` on the same origin.
   The page ID `newpage` is temporary; change it in the iframe URL when ready. The
   iframe resolves the actual task class server-side for `table` (for example
   `incident` or `sc_task`) and passes the validated original task ID as `sys_id`. Verify that the portal
   can be framed by this page under the instance's framing policy.

This is a first functional implementation candidate, not instance-validated.
Bootstrap class names follow the widget style; UI Page theme asset availability,
Jelly evaluation/escaping, native ACL behavior, and portal framing need verification.
No Classic UI Action or Workspace modal launcher has been installed. Both can
open this task-context URL later; the correct launcher depends on the host UI.
No notification, end-user link, persistence, or completed save workflow exists yet.

## Separation and access

`TaskInputSource.read(taskId)` uses `GlideRecordSecure` for the task, RITM,
`sc_item_option_mtom`, `sc_item_option`, `question_answer`, `item_option_new`, and `question_choice`.
It checks referenced-field access, question and variable-set read roles, metadata
field access, and choice field access.
It reads existing stored-answer relationships; questions without those relationships
and multi-row sets are not included. Secure-table visibility and
native variable access parity need instance review; the service is not a claim
of complete parity with every native variable access rule. `TaskInputSource` is
the single source Script Include for both catalog and record-producer variables.
The redundant `RequestInputSource` compatibility wrapper has been removed. If it
was installed previously, remove it after updating any external callers to
`TaskInputSource`. Keep the UI Page ACL
restricted to agents and verify least-privilege cases before use.

Supported basic source types are converted into independent questions. Source
identities appear in editor IDs/names for stable matching, not as native question
sys_id properties. Existing readonly/mandatory states, defaults, client scripts,
policies, and answer values are not copied. Unsupported source types are displayed
as disabled with a reason. Qualified references are disabled pending a supported
qualifier resolver instead of silently dropping their constraints. Attachment,
custom widget, lookup, Requested For, and layout-marker conversion are not offered
by this selector yet, even though the general builder has some of those methods.

The widget in preview mode re-authorizes and reloads questions on each render. It accepts
selected source IDs/order/title and rebuilds authoritative field definitions; it
ignores client-provided values, options, types, and scripts. Same-origin messages
are also checked against the expected iframe/parent window. The JSON adapter
is not exposed as an unrestricted client-callable service.

Preview mode permits field interaction but disables Save. Normal mode uses
the same widget with its local-only Save placeholder. Neither updates
request variables. The preview is the generated form's native field rendering;
it is not impersonation or proof that the eventual end user has identical lookup
access or presentation. No end-user identity has been selected yet.

## Instance validation

Check an editable non-catalog task with record-producer questions, a task without questions, a catalog task and its RITM, an unauthorized task, a read-only task,
variable read roles, static choices, disabled types, reference qualifiers,
empty sources, blank starting answers, selecting/deselecting, repeated previews,
and HTML-like question labels. Verify current source values remain unchanged.
Then test the page from each intended Classic/Workspace entry point.
