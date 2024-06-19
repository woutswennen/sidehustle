
// base model
class RegexNode {
    derive(char) {
        return NeverMatches;
    }
    matchEnd() { return false; }
    canMatchMore() { return !this.matchEnd(); }
}
class _EmptyString extends RegexNode {
    matchEnd() { return true; }
}
const EmptyString = new _EmptyString();
const NeverMatches = new RegexNode();

// derivative of node is the next one if char matches otherwise no match
class CharacterNode extends RegexNode {
    constructor(char, next) {
        super();
        this.char = char;
        this.next = next;
    }

    derive(char) {
        if (char === this.char) {
            return this.next;
        } else {
            return NeverMatches;
        }
    }
}

// regex representation => | 
class AlternationNode extends RegexNode {
    constructor(alternatives) {
        super();
        // filter out all alternatives which are null match
        let _alternatives = alternatives.filter((alt) => alt !== NeverMatches);
        // no match found because alternatives are finnished
        if (_alternatives.length === 0) {
            return NeverMatches;  // return only alternative left
        } else if (_alternatives.length === 1) {
            return _alternatives[0];
        // return filtered alternatives
        } else {
            this.alternatives = _alternatives;
        }
        return this;AlternationNode
    }

    derive(char) {
        return new AlternationNode(this.alternatives.map((alt) => alt.derive(char)));

    }
    matchEnd() { return this.alternatives.some((alt) => alt.matchEnd()); }
    canMatchMore() { return this.alternatives.some((alt) => alt.canMatchMore()); }
}

// Function to log the instance returned by head
function logInstance(result) {
    if (result instanceof CharacterNode || result instanceof AlternationNode) {
        console.log(`Returned instance: ${result.constructor.name}`);
        if (result instanceof CharacterNode) {
            console.log(`Character matched: ${result.char}`);
        }
    } else if (result === EmptyString) {
        console.log("Returned instance: EmptyString; match complete");
    } else if (result === NeverMatches) {
        console.log("Returned instance: NeverMatches");
    } else {
        console.log("Unexpected result:", result);
    }
}

// Example of regex match 'a(b|c)d'
let commonTail = new CharacterNode('d', EmptyString),
    alternation = new AlternationNode([
        new CharacterNode('b', commonTail),
        new CharacterNode('c', commonTail)
    ]),
    head = new CharacterNode('a', alternation);

// logInstance(head.derive('a')); //=> the AlternationNode in the middle
// logInstance(head.derive('a').derive('b')); //=> the CharacterNode 'd'
// logInstance(head.derive('a').derive('e')); //=> NeverMatches
// logInstance(head.derive('a').derive('b').derive('d')); //=> EmptyString; match complete

class AnyCharacterNode extends RegexNode {
    constructor (next) {
        super();
        this.next = next;
    }

    derive (char) { return this.next; }
}

class RepetitionNode extends RegexNode {
    constructor(next) {
        super();
        // head will be set properly later by modification
        this.head = NeverMatches;
        this.next = next;
    }

    derive(char) {
        return new AlternationNode([
            this.head.derive(char),
            this.next.derive(char),
        ]);
    }
    matchEnd(){ return this.next.matchEnd(); }
    canMatchMore(){ return true; }
}


// test repetition
let tail = new CharacterNode('d', EmptyString),
    repetition = new RepetitionNode(tail),
    repetitionBody = new CharacterNode('a', new CharacterNode('b', new CharacterNode('c', repetition)));

// this is the side-effectual part I mentioned which sets up the cycle
repetition.head = repetitionBody;

// logInstance(repetition.derive('a')); //=> the CharacterNode b
// logInstance(repetition.derive('d')); //=> EmptyString; match complete
// let repeatedOnce = repetition.derive('a').derive('b').derive('c'); // => the same RepetitionNode again
// logInstance(repeatedOnce.derive('a')) // => back to b
// logInstance(repeatedOnce.derive('d')) // => EmptyString again

// Core regex functionality is writen, lets build to a better interface
// Datatypes, fuctions, objects
class _Or {
    constructor (alternatives) {
        this.alternatives = alternatives;
    }
}
function Or(alternatives) {
    if (!(alternatives instanceof Array)) {
        throw new TypeError("alternatives passed to Or must be an Array");
    } else {
        return new _Or(alternatives);
    }
}

class _ZeroOrMore {
    constructor (repeatable) {
        this.repeatable = repeatable;
    }
}
function ZeroOrMore(repeatable) {
    return new _ZeroOrMore(repeatable);
}

const Any = Symbol('Any');

// Compilers
// turn string in linked char list
function compileString(str, tail=EmptyString) {
    let reversedStr = Array.from(str).reverse();
    for (let char of reversedStr) {
        tail = new CharacterNode(char, tail);
    }
    return tail;
}

function compileArray(arr, tail=EmptyString) {
    for (let expr of arr.reverse()) {
        tail = compile(expr, tail);
    }
    return tail;
}

function compileOr(or, tail=EmptyString) {
    return new AlternationNode(or.alternatives.map((alternative) => compile(alternative, tail)));
}


// Handle circular link by linking the content as the repetition head after the contents are compiled
function compileZeroOrMore(zeroOrMore, tail=EmptyString) {
    let repetition = new RepetitionNode(tail),
        contents = compile(zeroOrMore.repeatable, repetition);
    repetition.head = contents;
    return repetition;
}

function compileAny(tail=EmptyString) {
    return new AnyCharacterNode(tail);
}


function compile(expr, tail=EmptyString) {
    if ((typeof expr) === 'string') {
        return compileString(expr, tail);
    } else if (expr instanceof Array) {
        return compileArray(expr, tail);
    } else if (expr instanceof _Or) {
        return compileOr(expr, tail);
    } else if (expr instanceof _ZeroOrMore) {
        return compileZeroOrMore(expr, tail);
    } else if (expr === Any) {
        return compileAny(tail);
    } else {
        throw new TypeError("tried to compile something that's not a valid regexp datum");
    }
}


class RE {
    constructor (regexp) {
        this.start = compile(regexp);
    }

    match (str) {
        let state = this.start,
            chars = Array.from(str);
        if ((chars.length === 0) && (state === EmptyString)) { return true; }
        for (let i = 0; i < chars.length; i++) {
            let char = chars[i];
            state = state.derive(char);
            if ((state.matchEnd()) && (i === (chars.length - 1))) {
                // both regex and char finished => match
                return true;
            } else if (state.matchEnd() && !state.canMatchMore()) {
                // regex finished but still chars left => no match
                return false;
            }
        }
        // char's finished but regex isnt => no match
        return false;
    }
}


// Example of usage
console.log(new RE(ZeroOrMore('abc')).match('abcabc')); //=> true
console.log(new RE([ZeroOrMore("abc"), "d"]).match("d")); //=> true
console.log(new RE(["a", Or(["a", "b"]), "d"]).match("abd")); //=> true
console.log(new RE(["a", Or(["a", "b"]), "d"]).match("aed")); //=> false

// because we're dealing with normal JS objects we can even define impromptu character classes ...
let Digit = Or(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']),
    usPhoneNumber = new RE([Or([['(', Digit, Digit, Digit, ') '], '']), Digit, Digit, Digit, '-', Digit, Digit, Digit, Digit]);;

console.log(usPhoneNumber.match('(415) 555-1212')); //=> true
console.log(usPhoneNumber.match('555-1212')); //=> true
console.log(usPhoneNumber.match('squirrel')); //=> false
