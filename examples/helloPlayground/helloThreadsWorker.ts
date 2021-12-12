import { expose } from 'threads/worker';

expose({
    hashPassword(password) {
        return password + '_fake';
    }
});
