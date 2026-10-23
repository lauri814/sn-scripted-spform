api.controller = function ($scope, $window, $timeout) {
    var c = this;
    var form;
    var generation = 0;
    c.render = !!c.data.myForm;

    $scope.$on('spModel.gForm.initialized', function (event, gForm) {
        form = gForm;
        c.formReady = true;
    });

    // Placeholder boundary for a future response-storage service. This never
    // calls request-variable APIs, submits a producer, or claims persistence.
    c.save = function () {
        if (c.data.previewMode || !form || !c.data.myForm)
            return;

        var answers = {};
        angular.forEach(c.data.myForm._fields, function (field, name) {
            if (['container_start', 'checkbox_container', 'label', 'rich_text_label',
                'break', 'formatter', 'widget'].indexOf(field.type) !== -1)
                return;
            answers[name] = form.getValue(name);
        });

        c.pendingResponse = {
            schemaVersion: 1,
            answers: answers
        };
        c.saveStatus = 'Answers collected locally. Saving is not connected yet.';
    };
    function notify(message) {
        if ($window.parent !== $window)
            $window.parent.postMessage(message, $window.location.origin);
    }
    function onMessage(event) {
        if (!c.data.previewMode) return;
        if (event.origin !== $window.location.origin || event.source !== $window.parent) return;
        var message = event.data;
        if (!message) return;
        if (message.type === 'scripted-input-preview-ping') {
            notify({type: 'scripted-input-preview-ready'});
            return;
        }
        if (message.type !== 'scripted-input-preview') return;
        var request = ++generation;
        $scope.$evalAsync(function () {
            c.render = false;
            form = null;
            c.formReady = false;
            c.pendingResponse = null;
            c.saveStatus = '';
            c.error = '';
            c.loading = true;
            c.server.get({action: 'preview', definition: message.definition, taskId: message.taskId})
                .then(function (response) {
                    if (request !== generation) return;
                    c.data = response.data;
                    c.error = c.data.error;
                    c.loading = false;
                    // Destroy the previous directive before rebinding the one-time model.
                    $timeout(function () { if (request === generation) c.render = !!c.data.myForm; });
                    notify({type: 'scripted-input-preview-result', error: c.error || ''});
                }, function () {
                    if (request !== generation) return;
                    c.loading = false;
                    c.error = 'The preview could not be loaded.';
                    notify({type: 'scripted-input-preview-result', error: c.error});
                });
        });
    }
    if (c.data.previewMode) {
        $window.addEventListener('message', onMessage);
        $scope.$on('$destroy', function () {
            generation++;
            $window.removeEventListener('message', onMessage);
        });
        notify({type: 'scripted-input-preview-ready'});
    }
};
