api.controller = function ($scope, $window, $timeout) {
    var c = this;
    var generation = 0;
    function notify(message) {
        if ($window.parent !== $window)
            $window.parent.postMessage(message, $window.location.origin);
    }
    function onMessage(event) {
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
    $window.addEventListener('message', onMessage);
    $scope.$on('$destroy', function () { $window.removeEventListener('message', onMessage); });
    notify({type: 'scripted-input-preview-ready'});
};
