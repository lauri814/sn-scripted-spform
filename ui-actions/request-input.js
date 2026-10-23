// Classic UI client-side UI Action. Onclick: openRequestInputBuilder(); return false;
function openRequestInputBuilder() {
    if (g_form.isNewRecord()) {
        g_form.addInfoMessage('Save the task before building an input form.');
        return;
    }
    var dialog = new GlideModal('request_input_builder', false, 1100);
    dialog.setTitle('Request additional input');
    dialog.setPreference('sysparm_task_id', g_form.getUniqueValue());
    dialog.render();
}
