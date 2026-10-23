// Compatibility alias for installations using the initial catalog-only name.
// Server-side only. Install TaskInputSource alongside this Script Include.
var RequestInputSource = Class.create();
RequestInputSource.prototype = {
    initialize: function () {},
    read: function (taskId) {
        return new TaskInputSource().read(taskId);
    },
    type: "RequestInputSource"
};
