const EmtyString = new RegexNode();
const NeverMatches = new RegexNode();

// base model
class RegexNode {
   derive (char) {
      return NeverMatches;
   }
}

// derivative of node is the next one if char matches otherwise no match
class CharacterNode extends RegexNode {
   constructor (char, next) {
      super();
      this.char = char;
      this.next = next;
    }

    derive (char) {
       if (char === this.char) {
          return this.next;
       } else {
          return NeverMatches;
       }
    }
}

//
class AlternationNode extends RegexNode {
   // filter out all alternatives which are null match
   constructor (alternatives) {
      super();
      let _alternatives = alternatives.filter((alt) alt !== NeverMatches);
      // no match found because alternatives are finnished      
      it (_alternatives.length === 0 ) {
          return NeverMatches;
      // return only alternative left
      } else if (_alternatives.length === 1) {
          return _alternatives[0];
      // return filtered alternatives
      } else {
          this.alternatives = _alternatives;
      }
      return this;
   }
   
   derive (char) {


	  }
}

