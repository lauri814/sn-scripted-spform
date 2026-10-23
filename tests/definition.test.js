const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const context = {Class: {create: () => function () {this.initialize.apply(this, arguments);}}};
vm.createContext(context);
for (const name of ['ScriptedFormBuilder', 'ScriptedFormDefinition']) {
 vm.runInContext(fs.readFileSync(path.join(__dirname, '../script-includes/' + name + '.js'), 'utf8'), context);
}
const Adapter = context.ScriptedFormDefinition;
const adapter = new Adapter();
const definition = JSON.parse(fs.readFileSync(path.join(__dirname, '../examples/form-definition.json'), 'utf8'));
const snapshot = JSON.stringify(definition);
const model = adapter.build(definition);
assert.equal(JSON.stringify(definition), snapshot);
assert.equal(JSON.stringify(model), JSON.stringify(adapter.build(snapshot)));
assert.equal(model._fields.owner.ed.reference, 'sys_user');
assert.equal(model._fields.priority.value, 'normal');
assert.equal(model._fields.approved._parent, 'checkbox_group_approved');
assert.equal(model._fields.checkbox_group_approved._parent, 'details');
assert.equal(model._sections[1].columns.length, 2);
assert.equal(model._sections[1].layout, '2down');
assert.equal(model.client_script.onLoad[0].name, 'Welcome');
assert(!('sys_id' in model.client_script.onLoad[0]));
assert(!('id' in model));
const mutate = (fn, pattern) => {
 const d = JSON.parse(snapshot); fn(d); assert.throws(() => adapter.build(d), pattern);
};
mutate(d => { d.schemaVersion = 2; }, /schemaVersion/);
mutate(d => { d.elements[0].fieldType = 'build'; }, /unsupported field type/);
mutate(d => { d.elements[0].options.mandatory = 'true'; }, /boolean/);
mutate(d => { d.elements[0].options = null; }, /expected an object/);
mutate(d => { d.elements[0].id = d.id; }, /duplicate editor id/);
mutate(d => { d.elements[0].name = 'checkbox_group_approved'; }, /duplicate runtime name/);
mutate(d => { d.elements[1].columns[0].elements.push({kind: 'container', id: 'nested', name: 'nested', label: '', columns: []}); }, /nested containers/);
mutate(d => { d.elements[1].columns = []; }, /1 to 12/);
mutate(d => { d.scripts[0].type = 'onChange'; d.scripts[0].fieldName = 'missing'; }, /defined field name/);
mutate(d => { d.scripts = null; }, /expected an array/);
mutate(d => { d.unrecognized = true; }, /unknown property/);
mutate(d => { d.elements[0].fieldType = 'reference'; }, /Element field-summary.*Reference table/);
assert.throws(() => adapter.build('{'), /could not parse JSON string/);
assert.throws(() => adapter.build(null), /missing input/);
const extra = JSON.parse(snapshot);
extra.elements[1].options.hashKey = 'container-hash';
extra.elements[1].columns[0].hashKey = 'left-hash';
extra.elements[1].columns[1].hashKey = 'right-hash';
extra.editor = {selected: 'field-summary'};
const withHashes = adapter.build(extra);
assert.equal(withHashes._sections[1].hashKey, 'container-hash');
assert.equal(withHashes._sections[1].columns[0].hashKey, 'left-hash');
assert.equal(withHashes._sections[1].columns[1].hashKey, 'right-hash');
assert(!('editor' in withHashes));
assert(!('columnHashKey' in extra.elements[1].options));
const attachment = {schemaVersion: 1, id: 'attachment-demo', elements: [
 {kind: 'field', id: 'file', name: 'file', label: 'File', fieldType: 'attachment'}
]};
assert.throws(() => adapter.build(attachment), /attachmentGuid/);
assert.equal(adapter.build(attachment, {attachmentGuid: 'temporary'})._attachmentGUID, 'temporary');
console.log('Definition adapter checks passed: conversion, copying, layout, scripts, runtime context, validation, and reuse.');

assert.throws(() => adapter.build(), /missing input/);
assert.throws(() => adapter.build([]), /expected a JSON object/);
const circular = {}; circular.self = circular;
assert.throws(() => adapter.build(circular), /could not copy definition object/);
vm.runInContext('var originalJSON = JSON; JSON = {parse: function () { throw new Error("JSON API diagnostic"); }};', context);
assert.throws(() => adapter.build('{}'), /could not parse JSON string: JSON API diagnostic/);
vm.runInContext('JSON = originalJSON;', context);
