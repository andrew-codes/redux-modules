import {expect} from 'chai';
import {createModule} from './';

suite('redux-modules', () => {
    test('it exports a create module utility function', () => {
        expect(createModule).to.be.a('function');
    });
});
