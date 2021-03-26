/*
MIT License

Copyright (c) 2021 shajunxing

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { CFunction, CCallback, readUintptr, readUintptrArray } from '../ffi/quickjs-ffi.js'
import { malloc, free, sizeof_uintptr_t, NULL, newstring } from '../ffi/quickjs-ffi.so'

const LIBSQLITE_SO = '/usr/lib/x86_64-linux-gnu/libsqlite3.so';
const sqlite3_open = new CFunction(LIBSQLITE_SO, 'sqlite3_open', null, 'int', 'string', 'pointer').invoke;
const sqlite3_errmsg = new CFunction(LIBSQLITE_SO, 'sqlite3_errmsg', null, 'string', 'pointer').invoke;
const sqlite3_close = new CFunction(LIBSQLITE_SO, 'sqlite3_close', null, 'int', 'pointer').invoke;
const sqlite3_exec = new CFunction(LIBSQLITE_SO, 'sqlite3_exec', null, 'int', 'pointer', 'string', 'pointer', 'pointer', 'pointer').invoke;
const sqlite3_free = new CFunction(LIBSQLITE_SO, 'sqlite3_free', null, 'void', 'pointer').invoke;

export class Database {
    pdb;
    constructor(filename) {
        let ppdb = malloc(sizeof_uintptr_t);
        let rc = sqlite3_open(filename, ppdb);
        this.pdb = readUintptr(ppdb);
        free(ppdb);
        if (rc > 0) {
            let err = sqlite3_errmsg(pdb);
            sqlite3_close(this.pdb);
            throw new Error(err);
        }
    }
    close = () => {
        sqlite3_close(this.pdb);
    }
    exec = (sql) => {
        let result = [];
        let cb = new CCallback(function (pArg, nCol, azVals, azCols) {
            let row = {};
            for (let i = 0; i < nCol; i++) {
                row[newstring(readUintptrArray(azCols, i))] = newstring(readUintptrArray(azVals, i));
            }
            result.push(row);
            return 0;
        }, null, 'int', 'pointer', 'int', 'pointer', 'pointer');
        let pperrmsg = malloc(sizeof_uintptr_t);
        sqlite3_exec(this.pdb, sql, cb.cfuncptr, NULL, pperrmsg);
        let perrmsg = readUintptr(pperrmsg);
        free(pperrmsg);
        cb.free();
        if (perrmsg != NULL) {
            let err = newstring(perrmsg);
            sqlite3_free(perrmsg);
            throw new Error(err);
        }
        return result;
    }
}

