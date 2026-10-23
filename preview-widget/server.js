(function () {
    if (!input || input.action !== 'preview') return;
    try {
        // Authorize and reload source metadata on every preview. Browser JSON
        // supplies selection/order/title only, never executable sources or values.
        var source = new TaskInputSource().read(input.taskId);
        var requested = input.definition;
        if (!requested || requested.schemaVersion !== 1 || !Array.isArray(requested.elements) ||
            !requested.elements.length || requested.elements.length > source.questions.length)
            throw new Error('Select at least one available question.');
        var available = {};
        source.questions.forEach(function (question) {available['source-' + question.id] = question;});
        var used = {};
        var definition = {schemaVersion: 1, id: 'agent-input-form',
            title: typeof requested.title === 'string' ? requested.title.substring(0, 200) : 'Additional information needed',
            elements: []};
        requested.elements.forEach(function (element) {
            var question = available[element.id];
            if (!question || !question.supported || used[element.id])
                throw new Error('A selected question is unavailable or duplicated.');
            used[element.id] = true;
            definition.elements.push({id: 'source-' + question.id, kind: 'field',
                fieldType: question.fieldType, name: 'input_' + question.id,
                label: question.label, options: question.options});
        });
        data.myForm = new ScriptedFormDefinition().build(definition);
        data.formTitle = definition.title;
    } catch (error) {
        data.error = String(error.message || error);
    }
})();
