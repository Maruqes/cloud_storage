
function okay(str) {
    console.log('\x1b[32m[+]\x1b[0m ' + str);
}

function error(str) {
    console.log('\x1b[31m[-]\x1b[0m ' + str);
}

function warn(str) {
    console.log('\x1b[33m[!]\x1b[0m ' + str);
}

function info(str) {
    console.log('\x1b[34m[*]\x1b[0m ' + str);
}


module.exports = {
    okay,
    error,
    warn,
    info
};