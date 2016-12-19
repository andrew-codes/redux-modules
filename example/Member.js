import {string} from 'react/PropTypes';
import {Effects, liftState, loop} from 'redux-loop';
import * as memberApi from './memberApi';
import {createModule} from './../src/index';

// Module name
const name = 'Member';

// default state is very flat, makes merging state without immutable structures easy.
const defaultState = {
    errors: null,
    loggingIn: null,
    loggedIn: null,
    members: {},
    saving: null,
    lastSaved: null
};

// Reducer that handles failures from server.
// the failure action will be exported on the MemberModule below.
const failure = (state, {payload}) => ({...state, errors: payload});

// Login and login related side effects
// =======================================
// Login: should update the loggingIn to the member username
// Side effect of authenticating against the memberApi (server).
const login = {
    // validation of payload types
    payloadTypes: {
        username: string.isRequired,
        password: string.isRequired
    },
    // reducer uses redux-loop to capture side effects
    reducer: (state, {payload}) => loop(
        {...state, loggingIn: payload.username},
        // Side effect: login to member API
        Effects.promise(memberApi.login, payload)
            // MemberModule actions are available because this has deferred execution
            .then(MemberModule.actions.loginSuccess)
            .catch(MemberModule.actions.loginFailure)
    )
};
const loginSuccess = {
    payloadTypes: {
        oid: string.isRequired
    },
    // redux middleware concept; intercept action payload before dispatching
    // format payload to include member object that is easily merged in dictionary { 'Member:1': { oid: 'Member:1', username: 'Jon' } }
    // this is just an example of its usage
    middleware: [
        ({payload}) => ({oid: payload.oid, member: {[payload.oid]: payload}})
    ],
    reducer: (state, {payload}) => ({
        ...state,
        loggingIn: null,
        loggedIn: payload.oid,
        members: {
            ...state.members,
            ...payload.member
        }
    })
};
// Can shortcut the object declaration with just a reducer
const loginFailure = (state, {payload}) => loop({
        ...state,
        loggingIn: null
    },
    // Side effect: AJAX failure via failure action
    Effects.constant(MemberModule.actions.failure(payload))
);

// Update a member (no side-effects)
// ====================================
// No side effects, local state change only
const update = {
    payloadTypes: {
        oid: string.isRequired
    },
    reducer: (state, {payload}) => ({
        ...state,
        members: {
            ...state.members,
            ...payload
        }
    })
};

// Save
// ====================================
// saves to server
const save = {
    payloadTypes: {
        oid: string.isRequired
    },
    reducer: (state, {payload}) => loop(
        {...state, saving: payload},
        // Side effect: save member to server
        Effects.promise(memberApi.save, payload)
            .then(MemberModule.actions.saveSuccess)
            .catch(MemberModule.actions.saveFailure)
    )
};
const saveSuccess = {
    payloadTypes: {
        oid: string.isRequired
    },
    reducer: (state, {payload}) => loop(
        {
            ...state,
            saving: null,
            lastSaved: payload.oid
        },
        // Side effect: update member via update action
        Effects.constant(MemberModule.actions.update(payload))
    )
};
const saveFailure = (state, {payload}) => loop({
        ...state,
        saving: null,
        lastSaved: null
    },
    Effects.Batch([
      // Side effect: update member by rolling back to previous member's data
      Effects.constant(MemberModule.actions.update(state.saving))
      // Side effect: AJAX failure via failure action
      Effects.constant(MemberModule.actions.failure(payload))
    ])
);

// Optimistic save
// ====================================
// Has two side effects, a save request to the server and then rolling-back in case of errors.
const optimisticSave = {
    payloadTypes: {
        oid: string.isRequired
    },
    reducer: (state, {payload}) => loop(
      // Optimistically updates state
      {
          ...state,
          members: {
              ...state.members,
              ...payload
          }
      },
        // Batch these side effects together and execute as one state mutation
        Effects.batch([
            // Second side effect, saving member to server
            Effects.constant(MemberModule.actions.save(payload))
        ])
    )
};

const MemberModule = createModule({
    name,
    defaultState,
    // forces all reducers not already following redux-loop pattern to follow it
    composes: [liftState],
    // Represents action creator/reducer combos
    transformations: {
        init: state => state,
        failure,
        login,
        loginFailure,
        loginSuccess,
        optimisticSave,
        save,
        saveFailure,
        saveSuccess,
        update
    }
});

// Exports:
//     actions :: [function],
//     reducer :: function,
//     constants :: [string]
export default MemberModule;
