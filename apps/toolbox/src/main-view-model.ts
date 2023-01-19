import { Observable, Frame, StackLayout } from '@nativescript/core';

export class HelloWorldModel extends Observable {
	viewDemo(args) {
		Frame.topmost().navigate({
			moduleName: `pages/${args.object.text}`,
		});
	}

	logSomething(args) {
		console.log('LOG SOMETHING');
	}
}
