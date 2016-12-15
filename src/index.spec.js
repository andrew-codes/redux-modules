import {expect} from 'chai';
import {createReducer} from './';

suite('redux-modules', () => {
    test('it exports a create reducer utility function', () => {
        expect(createReducer).to.be.a('function');
    });
});
