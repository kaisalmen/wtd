import { describe, expect, test } from 'vitest';
import { DataPayloadHandler } from '../src/DataPayload.js';

describe('DataPayload applyProperties Tests', () => {
    test('verify empty', () => {
        const objToAlter = {
            'alpha': 2
        };
        const params = {};
        DataPayloadHandler.applyProperties(objToAlter, params, false);
        expect(objToAlter).toEqual(objToAlter);
    });

    test('verify props', () => {
        const objToAlter = {
            'alpha': 2
        };
        const paramsWithProps = {
            'alpha': 5
        };
        const objToAlterTarget = {
            'alpha': 5
        };
        DataPayloadHandler.applyProperties(objToAlter, paramsWithProps, false);
        expect(objToAlter).toEqual(objToAlterTarget);
    });

    test('verify props, second level', () => {
        const objToAlter = {
            'alpha': 2,
            'beta': undefined
        };
        const paramsWithPropsL2 = {
            'alpha': 7,
            'beta': {
                'beta2': true
            }
        };
        const objToAlterTarget = {
            'alpha': 7,
            'beta': {
                'beta2': true
            }
        };
        DataPayloadHandler.applyProperties(objToAlter, paramsWithPropsL2, false);
        expect(objToAlter).toEqual(objToAlterTarget);
    });

    class Class4ApplyProperties {
        private coffee: string;
        private sugar: number;
        private milk: string;

        constructor(coffee: string, sugar: number, milk: string) {
            this.coffee = coffee;
            this.sugar = sugar;
            this.milk = milk;
        }

        getCoffee() {
            return this.coffee;
        }

        getSugar() {
            return this.sugar;
        }

        getMilk() {
            return this.milk;
        }
    }

    test('verify class', () => {
        const testClassRef = new Class4ApplyProperties('columbian', 2, '0ml');
        const testClassAlter = new Class4ApplyProperties('columbian', 2, '0ml');
        const paramsWithProps = {
            'milk': '20ml',
            'sugar': 1
        };
        const testClassTarget = new Class4ApplyProperties('columbian', 1, '20ml');

        DataPayloadHandler.applyProperties(testClassAlter, paramsWithProps, false);
        expect(testClassAlter).toEqual(testClassTarget);
        expect(testClassRef).not.toEqual(testClassAlter);
        expect(testClassRef).not.toEqual(testClassTarget);
    });
});
