import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';

console.log(`Greetings from ${module.id}!`);


//TODO Application
import TodoApp from '../imports/ui/todos/TodoApp';

Meteor.startup(() => {
    render(<TodoApp />, document.getElementById('app'));
});
