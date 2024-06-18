
// base model
class RegexNode {
    derive(char) {
        return NeverMatches;
    }
}
const EmptyString = new RegexNode();
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
        return this;
    }

    derive(char) {
        return new AlternationNode(this.alternatives.map((alt) => alt.derive(char)));

    }
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

logInstance(head.derive('a')); //=> the AlternationNode in the middle
logInstance(head.derive('a').derive('b')); //=> the CharacterNode 'd'
logInstance(head.derive('a').derive('e')); //=> NeverMatches
logInstance(head.derive('a').derive('b').derive('d')); //=> EmptyString; match complete

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
}


// test repetition
let tail = new CharacterNode('d', EmptyString),
    repetition = new RepetitionNode(tail),
    repetitionBody = new CharacterNode('a', new CharacterNode('b', new CharacterNode('c', repetition)));

// this is the side-effectual part I mentioned which sets up the cycle
repetition.head = repetitionBody;

logInstance(repetition.derive('a')); //=> the CharacterNode b
logInstance(repetition.derive('d')); //=> EmptyString; match complete
let repeatedOnce = repetition.derive('a').derive('b').derive('c'); // => the same RepetitionNode again
logInstance(repeatedOnce.derive('a')) // => back to b
logInstance(repeatedOnce.derive('d')) // => EmptyString again

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

// Compiler
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
