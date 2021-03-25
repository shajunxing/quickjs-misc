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

import * as std from 'std'
import * as os from 'os'

const __S_IFMT = 0o0170000; /* These bits determine file type.  */
const __S_IFDIR = 0o0040000;	/* Directory.  */
const __S_IFCHR = 0o0020000;	/* Character device.  */
const __S_IFBLK = 0o0060000;	/* Block device.  */
const __S_IFREG = 0o0100000;	/* Regular file.  */
const __S_IFIFO = 0o0010000;	/* FIFO.  */
const __S_IFLNK = 0o0120000;	/* Symbolic link.  */
const __S_IFSOCK = 0o0140000;	/* Socket.  */
const __S_ISTYPE = (mode, mask) => (((mode) & __S_IFMT) === (mask));
const S_ISDIR = (mode) => __S_ISTYPE((mode), __S_IFDIR);
const S_ISCHR = (mode) => __S_ISTYPE((mode), __S_IFCHR);
const S_ISBLK = (mode) => __S_ISTYPE((mode), __S_IFBLK);
const S_ISREG = (mode) => __S_ISTYPE((mode), __S_IFREG);
const S_ISFIFO = (mode) => __S_ISTYPE((mode), __S_IFIFO);
const S_ISLNK = (mode) => __S_ISTYPE((mode), __S_IFLNK);
const S_ISSOCK = (mode) => __S_ISTYPE((mode), __S_IFSOCK);

function dirname(path) {
    let segs = path.split('/');
    segs.pop();
    if (segs.length == 1 && segs[0] == '') {
        return '/';
    } else {
        return segs.join('/');
    }
}

function normpath(path) {
    let segs = path.split('/');
    let isabs = path.startsWith('/');
    let ns = [];
    for (let seg of segs) {
        if (seg === '.' || seg === '') {
            continue;
        } else if (seg === '..') {
            if (isabs) {
                ns.pop();
            } else {
                if (ns.length === 0 || ns[ns.length - 1] === '..') {
                    ns.push('..');
                } else {
                    ns.pop();
                }
            }
        } else {
            ns.push(seg);
        }
    }
    return isabs ? '/' + ns.join('/') : ns.join('/');
}

function exists(path) {
    let [st, err] = os.stat(path);
    return err === 0;
}

function isfile(path) {
    let [st, err] = os.stat(path);
    return err === 0 && S_ISREG(st.mode);
}

function isdir(path) {
    let [st, err] = os.stat(path);
    return err === 0 && S_ISDIR(st.mode);
}

const cwdStack = [dirname(scriptArgs[0])];
const moduleCache = {};
export let nodeModulesPath = cwdStack[0];
let localModulesPath = nodeModulesPath;

export function require(path) {
    let cwd = cwdStack[cwdStack.length - 1];
    let abspath;
    let fname;
    let isjson = false;
    let resolve = () => {
        // console.log(abspath);
        if (exists(abspath + '/node_modules')) {
            localModulesPath = abspath + '/node_modules';
        }
        let [st, err] = os.stat(abspath);
        if (err === 0) { // exists
            if (S_ISREG(st.mode)) {
                fname = abspath;
            } else if (S_ISDIR(st.mode)) {
                if (isfile(abspath + '/package.json')) {
                    fname = abspath + '/' + JSON.parse(std.loadFile(abspath + '/package.json')).main;
                } else if (isfile(abspath + '/index.js')) {
                    fname = abspath + '/index.js';
                } else {
                    throw new Error(path + ' is directory but invalid');
                }
            } else {
                throw new Error(path + ' extsts but neither file nor directory');
            }
        } else if (isfile(abspath + '.js')) {
            fname = abspath + '.js';
        } else if (isfile(abspath + '.json')) {
            fname = abspath + '.json';
            isjson = true;
        } else {
            throw new Error(abspath + ' not extsts');
        }
    }
    if (path.startsWith('/') || path.startsWith('./') || path.startsWith('../')) {
        abspath = cwd + '/' + path;
        resolve();
    } else {
        try {
            abspath = localModulesPath + '/' + path;
            resolve();
        } catch (e) {
            abspath = nodeModulesPath + '/' + path;
            resolve();
        }
    }
    fname = normpath(fname);
    if (moduleCache.hasOwnProperty(fname)) {
        return moduleCache[fname];
    } else {
        // console.log('loading ' + fname);
        cwdStack.push(dirname(fname));
        let ret;
        if (isjson) {
            ret = JSON.parse(std.loadFile(fname));
        } else {
            let module = { exports: {} };
            let exports = module.exports;
            eval(std.loadFile(fname));
            ret = module.exports;
        }
        cwdStack.pop();
        moduleCache[fname] = ret;
        return ret;
    }
}

require.cache = moduleCache;

// require('./a/foo.js');
