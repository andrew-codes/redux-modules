export const login = ({username, password}) => Promise.resolve({oid: 'Member:1', username, name: 'Jon'});
export const save = ({oid, name}) => Promise.resolve({oid, name});
