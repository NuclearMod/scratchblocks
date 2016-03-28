/*
 * scratchblocks
 * http://scratchblocks.github.io/
 *
 * Copyright 2013, Tim Radvan
 * @license MIT
 * http://opensource.org/licenses/MIT
 */

/*
 * The following classes are used:
 *
 * Categories:
 *
 *     sb2
 *     inline-block
 *     script
 *     empty
 *
 * Comments:
 *
 *     comment
 *     attached
 *     to-hat
 *     to-reporter
 *
 * Shapes:
 *
 *     hat                |- Blocks  (These come from the database, the rest
 *     cap                |           come from the parsed code.)
 *
 *     stack              |
 *     embedded           |- Blocks
 *     boolean            |
 *
 *     reporter           |- This one's kinda weird.
 *                           "embedded" and "reporter" should really be the
 *                           same thing, but are separate due to some
 *                           implementation detail that I don't even remember.
 *
 *     string             |
 *     dropdown           |
 *     number             |
 *     number-dropdown    |- Inserts
 *     color              |
 *     define-hat         |
 *     outline            |
 *
 *     cstart |
 *     celse  |- Parser directives. (Used in the database to tell the parser
 *     cend   |                      to create the C blocks.)
 *
 *     cmouth |
 *     cwrap  |- Only used in the CSS code
 *     capend |
 *
 *     ring
 *     ring-inner
 *
 * Categories (colour):
 *
 *     motion
 *     looks
 *     sound
 *     pen
 *     variables
 *     list
 *
 *     events
 *     control
 *     sensing
 *     operators
 *
 *     custom
 *     custom-arg
 *     extension -- Sensor blocks
 *     grey -- for the ". . ." ellipsis block
 *
 *     obsolete
 *
*/

String.prototype.startsWith = function(prefix) {
  return this.indexOf(prefix) === 0;
};

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function(substring) {
  return this.indexOf(substring) !== -1;
};

String.prototype.trimLeft = function() {
  return this.replace(/^\s+/, "");
}

String.prototype.trimRight = function() {
  return this.replace(/\s+$/, "");
}



var scratchblocks2 = function () {
  "use strict";

  function assert(bool) {
    if (!bool) throw "Assertion failed!";
  }

  var sb2 = {}; // The module we export.



  // List of classes we're allowed to override.

  var override_categories = ["motion", "looks", "sound", "pen",
    "variables", "list", "events", "control", "sensing",
    "operators", "custom", "custom-arg", "extension", "grey",
    "obsolete"];
  var override_flags = ["cstart", "celse", "cend", "ring"];
  var override_shapes = ["hat", "cap", "stack", "embedded",
    "boolean", "reporter"];



  /*** Database ***/

  // First, initialise the blocks database.

  /*
   * We need to store info such as category and shape for each block.
   *
   * This can be indexed in two ways:
   *
   *  - by the text input to the parser, minus the insert parts
   *
   *      (eg. "say [Hi!] for (3) secs" is minifed to "sayforsecs", which we
   *           then look up in the database
   *
   *  - by a language code & blockid
   *
   *      (eg. "de" & "say _ for _ secs")
   *
   *      This is used by external add-ons for translating between languages,
   *      and won't get used internally.
   *
   * Some definitions:
   *
   *  - spec: The spec for the block, with underscores representing inserts.
   *          May be translated.
   *          eg. "sage _ für _ Sek."
   *
   *  - blockid: the English spec.
   *          eg. "say _ for _ secs"
   *
   */

  var strings = sb2.strings = {
    aliases: {},

    define: [],
    ignorelt: [],
    math: [],
    osis: [],
  };

  // languages that should be displayed right to left
  var rtl_languages = ['ar', 'fa', 'he'];

  var languages = sb2.languages = {};
  var block_info_by_id = sb2.block_info_by_id = {};
  var block_by_text = {};
  var blockids = []; // Used by load_language

  // Build the English blocks.

  var english = {
    code: "en",

    aliases: {
      "turn left _ degrees": "turn @arrow-ccw _ degrees",
      "turn ccw _ degrees": "turn @arrow-ccw _ degrees",
      "turn ↺ _ degrees": "turn @arrow-ccw _ degrees",
        "turn right _ degrees": "turn @arrow-cw _ degrees",
        "turn cw _ degrees": "turn @arrow-cw _ degrees",
          "turn ↻ _ degrees": "turn @arrow-cw _ degrees",
          "when gf clicked": "when @green-flag clicked",
            "when flag clicked": "when @green-flag clicked",
            "when green flag clicked": "when @green-flag clicked",
              "when ⚑ clicked": "when @green-flag clicked",
    },

    define: ["define"],

      // For ignoring the lt sign in the "when distance < _" block
    ignorelt: ["when distance"],

      // Valid arguments to "of" dropdown, for resolving ambiguous situations
    math: ["abs", "floor", "ceiling", "sqrt", "sin", "cos", "tan", "asin",
      "acos", "atan", "ln", "log", "e ^", "10 ^"],

      // For detecting the "stop" cap / stack block
    osis: ["other scripts in sprite", "other scripts in stage"],

    blocks: [], // These are defined just below

    palette: { // Currently unused
      "Control": "Control",
      "Data": "Data",
      "Events": "Events",
      "Looks": "Looks",
        "More Blocks": "More Blocks",
      "Motion": "Motion",
      "Operators": "Operators",
      "Pen": "Pen",
      "Sensing": "Sensing",
      "Sound": "Sound",
      "List": "Lists",
      "Variables": "Variables",
    },
  };

  var image_text = {
    "arrow-cw": "↻",
    "arrow-ccw": "↺",
  };

  var english_blocks = [
    ["motion"],

    ["move _ steps", []],
    ["turn @arrow-ccw _ degrees", []],
    ["turn @arrow-cw _ degrees", []],

    ["point in direction _", []],
    ["point towards _", []],

    ["go to x:_ y:_", []],
    ["go to _", []],
    ["glide _ secs to x:_ y:_", []],

    ["change x by _", []],
    ["set x to _", []],
    ["change y by _", []],
    ["set y to _", []],

    ["if on edge, bounce", []],

    ["set rotation style _", []],

    ["x position", []],
    ["y position", []],
    ["direction", []],



    ["looks"],

    ["say _ for _ secs", []],
    ["say _", []],
    ["think _ for _ secs", []],
    ["think _", []],

    ["show", []],
    ["hide", []],

    ["switch costume to _", []],
    ["next costume", []],
    ["switch backdrop to _", []],

    ["change _ effect by _", []],
    ["set _ effect to _", []],
    ["clear graphic effects", []],

    ["change size by _", []],
    ["set size to _%", []],

    ["go to front", []],
    ["go back _ layers", []],

    ["costume #", []],
    ["backdrop name", []],
    ["size", []],

    // Stage-specific

    ["switch backdrop to _ and wait", []],
    ["next backdrop", []],

    ["backdrop #", []],

    // Scratch 1.4

    ["switch to costume _", []],

    ["switch to background _", []],
    ["next background", []],
    ["background #", []],



    ["sound"],

    ["play sound _", []],
    ["play sound _ until done", []],
    ["stop all sounds", []],

    ["play drum _ for _ beats", []],
    ["rest for _ beats", []],

    ["play note _ for _ beats", []],
    ["set instrument to _", []],

    ["change volume by _", []],
    ["set volume to _%", []],
    ["volume", []],

    ["change tempo by _", []],
    ["set tempo to _ bpm", []],
    ["tempo", []],



    ["pen"],

    ["clear", []],

    ["stamp", []],

    ["pen down", []],
    ["pen up", []],

    ["set pen color to _", []],
    ["change pen color by _", []],
    ["set pen color to _", []],

    ["change pen shade by _", []],
    ["set pen shade to _", []],

    ["change pen size by _", []],
    ["set pen size to _", []],



    ["variables"],

    ["set _ to _", []],
    ["change _ by _", []],
    ["show variable _", []],
    ["hide variable _", []],



    ["list"],

    ["add _ to _", []],

    ["delete _ of _", []],
    ["insert _ at _ of _", []],
    ["replace item _ of _ with _", []],

    ["item _ of _", []],
    ["length of _", []],
    ["_ contains _", []],

    ["show list _", []],
    ["hide list _", []],



    ["events"],

    ["when @green-flag clicked", ["hat"]],
    ["when _ key pressed", ["hat"]],
    ["when this sprite clicked", ["hat"]],
    ["when Stage clicked", ["hat"]],
    ["when backdrop switches to _", ["hat"]],

    ["when _ > _", ["hat"]],

    ["when I receive _", ["hat"]],
    ["broadcast _", []],
    ["broadcast _ and wait", []],



    ["control"],

    ["wait _ secs", []],

    ["repeat _", ["cstart"]],
    ["forever", ["cstart", "cap"]],
    ["if _ then", ["cstart"]],
    ["else", ["celse"]],
    ["end", ["cend"]],
    ["wait until _", []],
    ["repeat until _", ["cstart"]],

    ["stop _", ["cap"]],

    ["when I start as a clone", ["hat"]],
    ["create clone of _", []],
    ["delete this clone", ["cap"]],

    // Scratch 1.4

    ["if _", ["cstart"]],
    ["forever if _", ["cstart", "cap"]],
    ["stop script", ["cap"]],
    ["stop all", ["cap"]],



    ["sensing"],

    ["touching _?", []],
    ["touching color _?", []],
    ["color _ is touching _?", []],
    ["distance to _", []],

    ["ask _ and wait", []],
    ["answer", []],

    ["key _ pressed?", []],
    ["mouse down?", []],
    ["mouse x", []],
    ["mouse y", []],

    ["loudness", []],

    ["video _ on _", []],
    ["turn video _", []],
    ["set video transparency to _%", []],

    ["timer", []],
    ["reset timer", []],

    ["_ of _", []],

    ["current _", []],
    ["days since 2000", []],
    ["username", []],

    // Scratch 1.4

    ["loud?", []],



    ["operators"],

    ["_ + _", []],
    ["_ - _", []],
    ["_ * _", []],
    ["_ / _", []],

    ["pick random _ to _", []],

    ["_ < _", []],
    ["_ = _", []],
    ["_ > _", []],

    ["_ and _", []],
    ["_ or _", []],
    ["not _", []],

    ["join _ _", []],
    ["letter _ of _", []],
    ["length of _", []],

    ["_ mod _", []],
    ["round _", []],

    ["_ of _", []],



    ["extension"],

    // PicoBoard

    ["when _", ["hat"]],
    ["when _ _ _", ["hat"]],
    ["sensor _?", []],
    ["_ sensor value", []],

    // LEGO WeDo

    ["turn _ on for _ secs", []],
    ["turn _ on", []],
    ["turn _ off", []],
    ["set _ power _", []],
    ["set _ direction _", []],
    ["when distance _ _", ["hat"]],
    ["when tilt _ _", ["hat"]],
    ["distance", []],
    ["tilt", []],

    // LEGO WeDo (old)

    ["turn motor on for _ secs", []],
    ["turn motor on", []],
    ["turn motor off", []],
    ["set motor power _", []],
    ["set motor direction _", []],
    ["when distance < _", ["hat"]],
    ["when tilt = _", ["hat"]],

    // Scratch 1.4

    ["motor on", []],
    ["motor off", []],
    ["motor on for _ secs", []],
    ["motor power _", []],
    ["motor direction _", []],



    ["grey"],

    ["…", []],
    ["...", []],
  ];

  // The blockids are the same as english block text, so we build the blockid
  // list at the same time.

  var category = null;
  for (var i=0; i<english_blocks.length; i++) {
    if (english_blocks[i].length === 1) { // [category]
      category = english_blocks[i][0];
    } else {                              // [block id, [list of flags]]
      var block_and_flags = english_blocks[i],
          spec = block_and_flags[0], flags = block_and_flags[1];
      english.blocks.push(spec);

      blockids.push(spec); // Other languages will just provide a list of
      // translations, which is matched up with this
      // list.

      // Now store shape/category info.
      var info = {
        blockid: spec,
        category: category,
      };

      while (flags.length) {
        var flag = flags.pop();
        switch (flag) {
          case "hat":
          case "cap":
            info.shape = flag;
            break;
          default:
            assert(!info.flag);
            info.flag = flag;
        }
      }

      var image_match = /@([-A-z]+)/.exec(spec);
      if (image_match) {
        info.image_replacement = image_match[1];
      }

      block_info_by_id[spec] = info;
    }
  }

  // Built english, now add it.

  load_language(english);

  function load_language(language) {
    language = clone(language);

    var iso_code = language.code;
    delete language.code;

    // convert blocks list to a dict.
    var block_spec_by_id = {};
    for (var i=0; i<language.blocks.length; i++) {
      var spec = language.blocks[i],
          blockid = blockids[i];
      spec = spec.replace(/@[-A-z]+/, "@"); // remove images
      block_spec_by_id[blockid] = spec;

      // Add block to the text lookup dict.
      var minispec = minify(normalize_spec(spec));
      if (minispec) block_by_text[minispec] = {
        blockid: blockid,
        lang: iso_code,
      };
    }
    language.blocks = block_spec_by_id;

    // add aliases (for images)
    for (var text in language.aliases) {
      strings.aliases[text] = language.aliases[text];

      // Add alias to the text lookup dict.
      var minispec = minify(normalize_spec(text));
      block_by_text[minispec] = {
        blockid: language.aliases[text],
        lang: iso_code,
      };
    }

    // add stuff to strings
    for (var key in strings) {
      if (strings[key].constructor === Array) {
        for (i=0; i<language[key].length; i++) {
          if (language[key][i]) {
            strings[key].push(minify(language[key][i]));
          }
        }
      }
    }

    languages[iso_code] = language;
  }
  sb2.load_language = load_language;

  // Store initial state.
  var _init_strings = clone(strings);
  var _init_languages = clone(languages);
  var _init_block_by_text = clone(block_by_text);

  sb2.reset_languages = function(language) {
    sb2.strings = strings = clone(_init_strings);
    sb2.languages = languages = clone(_init_languages);
    block_by_text = clone(_init_block_by_text);
  }

  // Hacks for certain blocks.

  block_info_by_id["_ of _"].hack = function (info, args) {
    // Operators if math function, otherwise sensing "attribute of" block
    if (!args.length) return;
    var func = minify(strip_brackets(args[0]).replace(/ v$/, ""));
    if (func == "e^") func = "e ^";
    if (func == "10^") func = "10 ^";
    info.category = (strings.math.indexOf(func) > -1) ? "operators"
      : "sensing";
  }

  block_info_by_id["length of _"].hack = function (info, args) {
    // List block if dropdown, otherwise operators
    if (!args.length) return;
    info.category = (/^\[.* v\]$/.test(args[0])) ? "list"
      : "operators";
  }

  block_info_by_id["stop _"].hack = function (info, args) {
    // Cap block unless argument is "other scripts in sprite"
    if (!args.length) return;
    var what = minify(strip_brackets(args[0]).replace(/ v$/, ""));
    info.shape = (strings.osis.indexOf(what) > -1) ? null
      : "cap";
  }

  // Define function for getting block info by text.

  function find_block(spec, args) {
    var minitext = minify(spec);
    if (minitext in block_by_text) {
      var lang_and_id = block_by_text[minitext];
      var blockid = lang_and_id.blockid;
      var info = clone(block_info_by_id[blockid]);
      info.lang = lang_and_id.lang;
      if (info.image_replacement) {
        info.spec = languages[lang_and_id.lang].blocks[blockid];
      } else {
        if (spec === "..." || spec === "…") spec = ". . .";
        info.spec = spec;
      }
      if (info.hack) info.hack(info, args);
      return info;
    }
    if (spec.replace(/ /g, "") === "...") return find_block("...");
  }

  sb2.find_block = find_block;

  // Utility function that deep clones dictionaries/lists.

  function clone(val) {
    if (val == null) return val;
    if (val.constructor == Array) {
      return val.map(clone);
    } else if (typeof val == "object") {
      var result = {}
      for (var key in val) {
        result[clone(key)] = clone(val[key]);
      }
      return result;
    } else {
      return val;
    }
  }

  // Text minifying functions normalise block text before lookups.

  function remove_diacritics(text) {
    text = text.replace("ß", "ss");
    var map = diacritics_removal_map;
    for (var i = 0; i < map.length; i++) {
      text = text.replace(map[i].letters, map[i].base);
    }
    return text;
  }

  function minify(text) {
    var minitext = text.replace(/[.,%?:▶◀▸◂]/g, "").toLowerCase()
      .replace(/[ \t]+/g, " ").trim();
    if (window.diacritics_removal_map) {
      minitext = remove_diacritics(minitext);
    }
    if (!minitext && text.replace(" ", "") === "...") minitext = "...";
    return minitext;
  }

  // Insert padding around arguments in spec

  function normalize_spec(spec) {
    return spec.replace(/([^ ])_/g, "$1 _").replace(/_([^ ])/g, "_ $1");
  }

  /*** Parse block ***/

  var BRACKETS = "([<{)]>}";

  // Various bracket-related utilities...

  function is_open_bracket(chr) {
    var bracket_index = BRACKETS.indexOf(chr);
    return (-1 < bracket_index && bracket_index < 4);
  }

  function is_close_bracket(chr) {
    return (3 < BRACKETS.indexOf(chr));
  }

  function get_matching_bracket(chr) {
    return BRACKETS[BRACKETS.indexOf(chr) + 4];
  }

  // Strip one level of brackets from around a piece.

  function strip_brackets(code) {
    if (is_open_bracket(code[0])) {
      var bracket = code[0];
      if (code[code.length - 1] === get_matching_bracket(bracket)) {
        code = code.substr(0, code.length - 1);
      }
      code = code.substr(1);
    }
    return code;
  }

  // Split the block code into text and inserts based on brackets.

  function split_into_pieces(code) {
    var pieces = [],
        piece = "",
        matching_bracket = "",
        nesting = [];

    for (var i=0; i<code.length; i++) {
      var chr = code[i];

      if (nesting.length > 0) {
        piece += chr;
        if (is_open_bracket(chr) && !is_lt_gt(code, i) &&
            nesting[nesting.length - 1] !== "[") {
          nesting.push(chr);
          matching_bracket = get_matching_bracket(chr);
        } else if (chr === matching_bracket && !is_lt_gt(code, i)) {
          nesting.pop();
          if (nesting.length === 0) {
            pieces.push(piece);
            piece = "";
          } else {
            matching_bracket = get_matching_bracket(
                nesting[nesting.length - 1]
                );
          }
        }
      } else {
        if (is_open_bracket(chr) && !is_lt_gt(code, i)) {
          nesting.push(chr);
          matching_bracket = get_matching_bracket(chr);

          if (piece) pieces.push(piece);
          piece = "";
        }
        piece += chr;
      }
    }
    if (piece) pieces.push(piece); // last piece
    return pieces;
  }

  // A piece is a block if it starts with a bracket.

  function is_block(piece) {
    return piece && is_open_bracket(piece[0]);
  }

  // Function for filtering pieces to get block text & args
  function filter_pieces(pieces) {
    var spec = "";
    var args = [];
    for (var i=0; i<pieces.length; i++) {
      var piece = pieces[i];
      if (is_block(piece) || typeof piece === "object") {
        args.push(piece);
        spec += "_";
      } else {
        spec += piece;
      }
    }
    return {spec: normalize_spec(spec), args: args};
  }

  // Take block code and return block info object.

  function parse_block(code, context, dont_strip_brackets) {
    // strip brackets
    var bracket;
    if (!dont_strip_brackets) {
      bracket = code.charAt(0);
      code = strip_brackets(code);
    }

    // split into text segments and inserts
    var pieces = split_into_pieces(code);

    // define hat?
    for (var i=0; i<strings.define.length; i++) {;;
      var define_text = strings.define[i];
      if (code.toLowerCase() === define_text || (pieces[0] &&
            pieces[0].toLowerCase().startsWith(define_text+" "))) {
        pieces[0] = pieces[0].slice(define_text.length).trimLeft();

        for (var i=0; i<pieces.length; i++) {
          var piece = pieces[i];
          if (is_block(piece)) {
            piece = {
              shape: get_custom_arg_shape(piece.charAt(0)),
              category: "custom-arg",
              pieces: [strip_brackets(piece).trim()],
            };
          }
          pieces[i] = piece;
        }

        return {
          shape: "define-hat",
          category: "custom",
          pieces: [code.slice(0, define_text.length), {
            shape: "outline",
            pieces: pieces,
          }],
        };
      }
    }

    // get shape
    var shape, isablock;
    if (pieces.length > 1 && bracket !== "[") {
      shape = get_block_shape(bracket);
      isablock = true;
    } else {
      shape = get_insert_shape(bracket, code);
      isablock = ["reporter", "boolean", "stack"].indexOf(shape) !== -1;
      if (shape.contains("dropdown")) {
        code = code.substr(0, code.length - 2);
      }
    }

    // insert?
    if (!isablock) {
      return {
        shape: shape,
        pieces: [code],
      };
    }

    // trim ends
    if (pieces.length) {
      pieces[0] = pieces[0].trimLeft();
      pieces[pieces.length-1] = pieces[pieces.length-1].trimRight();
    }

    // filter out block text & args
    var filtered = filter_pieces(pieces);
    var spec = filtered.spec;
    var args = filtered.args;

    // override attrs?
    var overrides;
    var match = /^(.*)::([A-z\- ]*)$/.exec(spec);
    if (match) {
      spec = match[1].trimRight();
      overrides = match[2].trim().split(/\s+/);
      while (overrides[overrides.length - 1] === "") overrides.pop();
      if (!overrides.length) overrides = undefined;
    }

    // get category & related block info
    if (spec) var info = find_block(spec, args);

    if (info) {
      if (!info.shape) info.shape = shape;
      if (info.flag === "cend") info.spec = "";
    } else {
      // unknown block
      info = {
        blockid: spec,
        shape: shape,
        category: (shape === "reporter") ? "variables" : "obsolete",
        lang: "en",
        spec: spec,
        args: args,
      };

      // For recognising list reporters & custom args
      if (info.shape === "reporter") {
        var name = info.spec;
        if (!(name in context.variable_reporters)) {
          context.variable_reporters[name] = [];
        }
        context.variable_reporters[name].push(info);
      }
    }

    // rebuild pieces (in case text has changed) and parse arguments
    var pieces = [];
    var text_parts = info.spec.split((info.blockid === "_ + _")
        ? /([_@▶◀▸◂])/ : /([_@▶◀▸◂+])/);
    for (var i=0; i<text_parts.length; i++) {
      var part = text_parts[i];
      if (part === "_") {
        var arg = args.shift();
        if (arg === undefined) {
          part = "_";
          /* If there are no args left, then the underscore must
           * really be an underscore and not an insert.
           *
           * This only becomes a problem if the code contains
           * underscores followed by inserts.
           */
        } else {
          part = parse_block(arg, context);
        }
      }
      if (part) pieces.push(part);
    }
    delete info.spec;
    delete info.args;
    info.pieces = pieces;

    if (overrides) {
      for (var i=0; i<overrides.length; i++) {
        var value = overrides[i];
        if (override_categories.indexOf(value) > -1) {
          info.category = value;
        } else if (override_flags.indexOf(value) > -1) {
          info.flag = value;
        } else if (override_shapes.indexOf(value) > -1) {
          info.shape = value;
        }
      }

      // Tag ring-inner pieces
      if (info.flag === "ring") {
        for (var i=0; i<info.pieces.length; i++) {
          var part = info.pieces[i];
          if (typeof part == "object") {
            part.is_ringed = true;
          }
        }
      }
    } else {
      // For recognising list reporters
      var list_block_name = {
        "add _ to _": 1,
        "delete _ of _": 1,
        "insert _ at _ of _": 2,
          "replace item _ of _ with _": 1,
          "item _ of _": 1,
            "length of _": 0,
            "_ contains _": 0,
              "show list _": 0,
              "hide list _": 0,
      };
      if (info.blockid in list_block_name) {
        var index = list_block_name[info.blockid];
        var args = filter_pieces(info.pieces).args;
        var arg = args[index];
        if (arg && arg.shape === "dropdown") {
          context.lists.push(arg.pieces[0]);
        }
      }
    }

    return info;
  }

  // Return block info object for line, including comment.

  function parse_line(line, context) {
    line = line.trim();

    // comments
    var comment;

    var i = line.indexOf("//");
    if (i !== -1 && line[i-1] !== ":") {
      comment = line.slice(i+2);
      line    = line.slice(0, i).trim();

      // free-floating comment?
      if (!line.trim()) return {blockid: "//", comment: comment,
        pieces: []};
    }

    var info;
    if (is_open_bracket(line.charAt(0))
        && split_into_pieces(line).length === 1) {
      // reporter
      info = parse_block(line, context); // don't strip brackets

      if (!info.category) { // cheap test for inserts.
        // Put free-floating inserts in their own stack block.
        info = {blockid: "_", category: "obsolete", shape: "stack",
          pieces: [info]};
      }
    } else {
      // normal stack block
      info = parse_block(line, context, true);
      // true = don't strip brackets
    }

    // category hack (DEPRECATED)
    if (comment && info.shape !== "define-hat") {
      var match = /(^| )category=([a-z]+)($| )/.exec(comment);
      if (match && override_categories.indexOf(match[2]) > -1) {
        info.category = match[2];
        comment = comment.replace(match[0], " ").trim();
      }
    }

    // For recognising custom blocks and their arguments
    if (info.shape === "define-hat") {
      var pieces = info.pieces[1].pieces;
      var filtered = filter_pieces(pieces);
      var minispec = minify(filtered.spec);
      context.define_hats.push(minispec);
      for (var i=0; i<filtered.args.length; i++) {
        context.custom_args.push(filtered.args[i].pieces[0]);
      }
    }
    if (info.shape === "stack" && info.category === "obsolete") {
      var minispec = minify(filter_pieces(info.pieces).spec);
      if (!(minispec in context.obsolete_blocks)) {
        context.obsolete_blocks[minispec] = [];
      }
      context.obsolete_blocks[minispec].push(info);
    }

    if (comment !== undefined && !comment.trim()) comment = undefined;
    info.comment = comment;
    return info;
  }

  // Functions to get shape from code.

  function get_block_shape(bracket) {
    switch (bracket) {
      case "(": return "embedded";
      case "<": return "boolean";
      case "{": default: return "stack";
    }
  }

  function get_insert_shape(bracket, code) {
    switch (bracket) {
      case "(":
        if (/^([0-9e.-]+( v)?)?$/i.test(code)) {
          if (code.endsWith(" v")) {
            return "number-dropdown";
          } else {
            return "number";
          }
        } else if (code.endsWith(" v")) {
          // rounded dropdowns (not actually number)
          return "number-dropdown";
        } else {
          // reporter (or embedded! TODO remove this comment)
          return "reporter";
        }
      case "[":
        if (/^#[a-f0-9]{3}([a-f0-9]{3})?$/i.test(code)) {
          return "color";
        } else {
          if (code.endsWith(" v")) {
            return "dropdown";
          } else {
            return "string";
          }
        }
      case "<":
        return "boolean";
      default:
        return "stack";
    }
  }

  function get_custom_arg_shape(bracket) {
    switch (bracket) {
      case "<": return "boolean";
      default:  return "reporter";
    }
  }

  // Check whether angle brackets are supposed to be lt/gt blocks.

  /*
   * We need a way to parse eg.
   *
   *      if <[6] < [3]> then
   *
   *  Obviously the central "<" should be ignored by split_into_pieces.
   *
   *  In addition, we need to handle blocks containing a lt symbol:
   *
   *      when distance < (30)
   *
   *  We do this by matching against `strings.ignorelt`.
   */

  // Returns true if it's lt/gt, false if it's an open/close bracket.

  function is_lt_gt(code, index) {
    var chr, i;

    if ((code[index] !== "<" && code[index] !== ">") ||
        index === code.length || index === 0) {
      return false;
    }

    // hat block containing lt symbol?
    for (var i=0; i<strings.ignorelt.length; i++) {
      var when_dist = strings.ignorelt[i];
      if (minify(code.substr(0, index)).startsWith(when_dist)) {
        return true; // don't parse as a boolean
      }
    }

    // look for open brackets ahead
    for (i = index + 1; i < code.length; i++) {
      chr = code[i];
      if (is_open_bracket(chr)) {
        break; // might be an innocuous lt/gt!
      }
      if (chr !== " ") {
        return false; // something else => it's a bracket
      }
    }

    // look for close brackets behind
    for (i = index - 1; i > -1; i--) {
      chr = code[i];
      if (is_close_bracket(chr)) {
        break; // must be an innocuous lt/gt!
      }
      if (chr !== " ") {
        return false; // something else => it's a bracket
      }
    }

    // we found a close bracket behind and an open bracket ahead, eg:
    //      ) < [
    return true; // it's an lt/gt block!
  }



  /*** Parse scripts ***/

  // Take scratchblocks text and turn it into useful objects.

  function parse_scripts(code) {
    var context = {obsolete_blocks: {}, define_hats: [], custom_args: [],
        variable_reporters: {}, lists: []};
    var scripts = [];
    var nesting = [[]];
    var lines = code.trim().split("\n");

    function new_script() {
      if (nesting[0].length) {
        while (nesting.length > 1) {
          do_cend({blockid: "end", category: "control",
            flag: "cend", shape: "stack", pieces: []});
        }
        scripts.push(nesting[0]);
        nesting = [[]];
      }
      current_script = nesting[nesting.length - 1];
    }

    function do_cend(info) {
      // pop the innermost script off the stack
      var cmouth = nesting.pop(); // cmouth contents
      if (cmouth.length && cmouth[cmouth.length - 1].shape == "cap") {
        // last block is a cap block
        info.flag += " capend";
      }
      var cwrap = nesting.pop();
      info.category = cwrap[0].category; // category of c block
      cwrap.push(info);
    }

    for (i=0; i<lines.length; i++) {
      var line = lines[i].trim();

      if (!line) {
        if (nesting.length <= 1) new_script();
        continue;
      }

      var current_script = nesting[nesting.length - 1];

      var info = parse_line(lines[i], context);

      if (!info.pieces.length && info.comment !== undefined
          && nesting.length <= 1) {
        // TODO multi-line comments
        new_script();
        current_script.push(info);
        new_script();
        continue;
      }

      switch (info.flag || info.shape) {
        case "hat":
        case "define-hat":
          new_script();
          current_script.push(info);
          break;

        case "cap":
          current_script.push(info);
          if (nesting.length <= 1) new_script();
          break;

        case "cstart":
          var cwrap = {
            type: "cwrap",
            shape: info.shape,
            contents: [info],
          };
          info.shape = "stack";
          current_script.push(cwrap);
          nesting.push(cwrap.contents);
          var cmouth = {type: "cmouth", contents: [],
                        category: info.category};
          cwrap.contents.push(cmouth);
          nesting.push(cmouth.contents);
          break;

        case "celse":
          if (nesting.length <= 1) {
            current_script.push(info);
            break;
          }
          var cmouth = nesting.pop(); // old cmouth contents
          if (cmouth.length
              && cmouth[cmouth.length - 1].shape == "cap") {
            // last block is a cap block
            info.flag += " capend";
          }
          var cwrap = nesting[nesting.length - 1]; // cwrap contents
          info.category = cwrap[0].category; // category of c block
          cwrap.push(info);
          var cmouth = {type: "cmouth", contents: [],
                        category: cwrap[0].category};
          cwrap.push(cmouth);
          nesting.push(cmouth.contents);
          break;

        case "cend":
          if (nesting.length <= 1) {
            current_script.push(info);
            break;
          }
          do_cend(info);
          break;

        case "reporter":
        case "boolean":
        case "embedded":
        case "ring":
          // put free-floating reporters in a new script
          new_script();
          current_script.push(info);
          new_script();
          break;

        default:
          current_script.push(info);
      }
    }
    new_script();

    // Recognise custom blocks
    for (var i=0; i<context.define_hats.length; i++) {
      var minispec = context.define_hats[i];
      var custom_blocks = context.obsolete_blocks[minispec];
      if (!custom_blocks) continue;
      for (var j=0; j<custom_blocks.length; j++) {
        custom_blocks[j].category = "custom";
      }
    }

    // Recognise list reporters
    for (var i=0; i<context.lists.length; i++) {
      var name = context.lists[i];
      var list_reporters = context.variable_reporters[name];
      if (!list_reporters) continue;
      for (var j=0; j<list_reporters.length; j++) {
        list_reporters[j].category = "list";
      }
    }

    // Recognise custom args
    for (var i=0; i<context.custom_args.length; i++) {
      var name = context.custom_args[i];
      var custom_args = context.variable_reporters[name];
      if (!custom_args) continue;
      for (var j=0; j<custom_args.length; j++) {
        custom_args[j].category = "custom-arg";
      }
    }

    return scripts;
  }

  sb2.parse_scripts = parse_scripts;



  /*** Render ***/

  /* Render all matching elements in page to shiny scratch blocks.
   * Accepts a CSS-style selector as an argument.
   *
   *  scratchblocks2.parse("pre.blocks");
   *
   * (This should really be called "render_all"...)
   */
  sb2.parse = function (selector, options) {
    selector = selector || "pre.blocks";
    options = options || {
      inline: false,
    }

    // find elements
    var results = document.querySelectorAll(selector);
    for (var i=0; i<results.length; i++) {
      var el = results[i];

      var html = el.innerHTML.replace(/<br>\s?|\n|\r\n|\r/ig, '\n');
      var pre = document.createElement('pre');
      pre.innerHTML = html;
      var code = pre.textContent;

      if (options.inline) {
        code = code.replace('\n', '');
      }

      var scripts = parse_scripts(code);
      scriptsToSVG(scripts, function(svg) {
        var container = document.createElement('div');
        container.classList.add("sb");
        if (options.inline) container.classList.add('sb-inline');
        container.appendChild(svg);

        el.innerHTML = '';
        el.appendChild(container);
      });
    }
  };

  sb2.render = function(code, cb) {
    var scripts = parse_scripts(code);
    scriptsToSVG(scripts, cb);
  };


  /* utils */

  function extend(src, dest) {
    src = src || {};
    for (var key in src) {
      if (src.hasOwnProperty(key) && !dest.hasOwnProperty(key)) {
        dest[key] = src[key];
      }
    }
    return dest;
  }

  var Point = function Point(x, y) {
    this.x = x;
    this.y = y;
    // TODO round points
  };
  Point.prototype.toString = function() {
    return [this.x, this.y].join(" ");
  };
  var P = function(x, y) {
    return new Point(x, y);
  };

  var Box = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  };
  var B = function(x, y, w, h) {
    return new Box(x, y, w, h);
  };

  /* for constucting SVGs */

  var xml = new DOMParser().parseFromString('<xml></xml>',  "application/xml")
  function cdata(content) {
    return xml.createCDATASection(content);
  }

  function el(name, props) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    return setProps(el, props);
  }

  var directProps = {
    textContent: true,
  };
  function setProps(el, props) {
    for (var key in props) {
      var value = '' + props[key];
      if (directProps[key]) {
        el[key] = value;
      } else if (/^xlink:/.test(key)) {
        el.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(6), value);
      } else if (props[key] !== null && props.hasOwnProperty(key)) {
        el.setAttributeNS(null, key, value);
      }
    }
    return el;
  }

  function withChildren(el, children) {
    for (var i=0; i<children.length; i++) {
      el.appendChild(children[i]);
    }
    return el;
  }

  function group(children) {
    return withChildren(el('g'), children);
  }

  function newSVG(width, height) {
    return el('svg', {
      version: "1.1",
      width: width,
      height: height,
    });
  }

  function polygon(props) {
    return el('polygon', extend(props, {
      points: props.points.join(" "),
    }));
  }

  function path(props) {
    return el('path', extend(props, {
      path: null,
      d: props.path.map(function(p) {
        return p.constructor === Point ? [p.x, p.y].join(" ") : p;
      }).join(" "),
    }));
  }

  function text(x, y, content, props) {
    var text = el('text', extend(props, {
      x: x,
      y: y,
      textContent: content,
    }));
    return text;
  }

  function symbol(href) {
    return el('use', {
      'xlink:href': href,
    });
  }

  function translate(dx, dy, el) {
    setProps(el, {
      transform: ['translate(', dx, ' ', dy, ')'].join(''),
    });
    return el;
  }


  /* shapes */

  function rect(w, h, props) {
    return el('rect', extend(props, {
      x: 0,
      y: 0,
      width: w,
      height: h,
    }));
  }

  function arc(p1, p2, rx, ry) {
    var r = p2.y - p1.y;
    return ["L", p1.x, p1.y, "A", rx, ry, 0, 0, 1, p2.x, p2.y].join(" ");
  }

  function cornerArc(p1, p2) {
    var r = p2.y - p1.y;
    return arc(p1, p2, r, r);
  }

  function roundedRect(w, h, props) {
    var r = h / 2;
    return path(extend(props, {
      path: [
        "M", P(r, 0),
        arc(P(w - r, 0), P(w - r, h), r, r),
        arc(P(r, h), P(r, 0), r, r),
        "Z"
      ],
    }));
  }

  function pointedRect(w, h, props) {
    var r = h / 2;
    return polygon(extend(props, {
      points: [
        P(r, 0),
        P(w - r, 0), P(w, r),
        P(w, r), P(w - r, h),
        P(r, h), P(0, r),
        P(0, r), P(r, 0),
      ],
    }));
  }

  function getTop(w) {
    return ["M", 0, 3,
      "L", 3, 0,
      "L", 13, 0,
      "L", 16, 3,
      "L", 24, 3,
      "L", 27, 0,
      "L", w - 3, 0,
      "L", w, 3
    ].join(" ");
  }

  function getRightAndBottom(w, y, hasNotch, inset) {
    if (typeof inset === "undefined") {
      inset = 0;
    }
    var arr = ["L", w, y - 3,
      "L", w - 3, y
    ];
    if (hasNotch) {
      arr = arr.concat([
        "L", inset + 27, y,
        "L", inset + 24, y + 3,
        "L", inset + 16, y + 3,
        "L", inset + 13, y
      ]);
    }
    if (inset > 0) {
      arr = arr.concat([
        "L", inset + 2, y,
        "L", inset, y + 2
      ])
    } else {
      arr = arr.concat([
        "L", inset + 3, y,
        "L", 0, y - 3
      ]);
    }
    return arr.join(" ");
  }

  function stackRect(w, h, props) {
    return path(extend(props, {
      path: [
        getTop(w),
        getRightAndBottom(w, h, true, 0),
      ],
    }));
  }

  function capRect(w, h, props) {
    return path(extend(props, {
      path: [
        getTop(w),
        getRightAndBottom(w, h, false, 0),
      ],
    }));
  }

  function hatRect(w, h, props) {
    return path(extend(props, {
      path: [
        "M", 0, 12,
        arc(P(0, 12), P(80, 10), 80, 80),
        "L", w - 3, 10, "L", w, 10 + 3,
        getRightAndBottom(w, h, true),
      ],
    }));
  }


  /* definitions */

  var cssContent;
  var request = new XMLHttpRequest();
  request.open('GET', 'blockpix.css', false);
  request.send(null);
  if (request.status === 200) {
    cssContent = request.responseText;
  }
  function makeStyle() {
    var style = el('style');
    style.appendChild(cdata(cssContent));
    return style;
  }

  function makeIcons() {
    return [
      el('path', {
        d: "M1.504 21L0 19.493 4.567 0h1.948l-.5 2.418s1.002-.502 3.006 0c2.006.503 3.008 2.01 6.517 2.01 3.508 0 4.463-.545 4.463-.545l-.823 9.892s-2.137 1.005-5.144.696c-3.007-.307-3.007-2.007-6.014-2.51-3.008-.502-4.512.503-4.512.503L1.504 21z",
        fill: '#3f8d15',
        id: 'greenFlag',
      }),
      el('path', {
        d: "M6.724 0C3.01 0 0 2.91 0 6.5c0 2.316 1.253 4.35 3.14 5.5H5.17v-1.256C3.364 10.126 2.07 8.46 2.07 6.5 2.07 4.015 4.152 2 6.723 2c1.14 0 2.184.396 2.993 1.053L8.31 4.13c-.45.344-.398.826.11 1.08L15 8.5 13.858.992c-.083-.547-.514-.714-.963-.37l-1.532 1.172A6.825 6.825 0 0 0 6.723 0z",
        fill: '#fff',
        id: 'turnRight',
      }),
      el('path', {
        d: "M3.637 1.794A6.825 6.825 0 0 1 8.277 0C11.99 0 15 2.91 15 6.5c0 2.316-1.253 4.35-3.14 5.5H9.83v-1.256c1.808-.618 3.103-2.285 3.103-4.244 0-2.485-2.083-4.5-4.654-4.5-1.14 0-2.184.396-2.993 1.053L6.69 4.13c.45.344.398.826-.11 1.08L0 8.5 1.142.992c.083-.547.514-.714.963-.37l1.532 1.172z",
        fill: '#fff',
        id: 'turnLeft',
      }),
    ];
  }

  var Filter = function(id, props) {
    this.el = el('filter', extend(props, {
      id: id,
      x0: '-50%',
      y0: '-50%',
      width: '200%',
      height: '200%',
    }));
    this.highestId = 0;
  };
  Filter.prototype.fe = function(name, props, children) {
    var shortName = name.toLowerCase().replace(/gaussian|osite/, '');
    var id = [shortName, '-', ++this.highestId].join('');
    this.el.appendChild(withChildren(el("fe" + name, extend(props, {
      result: id,
    })), children || []));
    return id;
  }
  Filter.prototype.comp = function(op, in1, in2, props) {
    return this.fe('Composite', extend(props, {
      operator: op,
      in: in1,
      in2: in2,
    }));
  }
  Filter.prototype.subtract = function(in1, in2) {
    return this.comp('arithmetic', in1, in2, { k2: +1, k3: -1 });
  }
  Filter.prototype.offset = function(dx, dy, in1) {
    return this.fe('Offset', {
      in: in1,
      dx: dx,
      dy: dy,
    });
  }
  Filter.prototype.flood = function(color, opacity, in1) {
    return this.fe('Flood', {
      in: in1,
      'flood-color': color,
      'flood-opacity': opacity,
    });
  }
  Filter.prototype.blur = function(dev, in1) {
    return this.fe('GaussianBlur', {
      'in': 'SourceAlpha',
      stdDeviation: [dev, dev].join(' '),
    });
  }
  Filter.prototype.merge = function(children) {
    this.fe('Merge', {}, children.map(function(name) {
      return el('feMergeNode', {
        in: name,
      });
    }));
  }

  function bevelFilter(id, inset) {
    var f = new Filter(id);

    var alpha = 'SourceAlpha';
    var s = inset ? -1 : 1;
    var blur = f.blur(1, alpha);

    f.merge([
      'SourceGraphic',
      f.comp('in',
           f.flood('#fff', 0.15),
           f.subtract(alpha, f.offset(+s, +s, blur))
      ),
      f.comp('in',
           f.flood('#000', 0.7),
           f.subtract(alpha, f.offset(-s, -s, blur))
      ),
    ]);

    return f.el;
  }

  function darkFilter(id) {
    var f = new Filter(id);

    f.merge([
      'SourceGraphic',
      f.comp('in',
        f.flood('#000', 0.2),
        'SourceAlpha'),
    ]);

    return f.el;
  }

  /* layout */

  function draw(o) {
    o.draw();
  }

  /* Label */

  var Label = function(value, cls) {
    this.el = text(0, 10, value, {
      class: cls || '',
    });
    this.width = null;
    if (value === "") {
      this.width = 0;
    } else if (value === " ") {
      this.width = 4.15625;
    } else {
      Label.measure(this);
    }
    this.height = 10;
    this.x = 0;
  };

  Label.prototype.draw = function() {
    return this.el;
  };

  Label.prototype.toString = function() {
    return this.value; // DEBUG
  };

  Label.measuring = null;
  Label.toMeasure = [];

  Label.startMeasuring = function() {
    Label.measuring = newSVG(1, 1);
    Label.measuring.classList.add('sb-measure');
    Label.measuring.style.visibility = 'hidden';
    document.body.appendChild(Label.measuring);

    var defs = el('defs');
    Label.measuring.appendChild(defs);
    defs.appendChild(makeStyle());
  };
  Label.measure = function(label) {
    Label.measuring.appendChild(label.el);
    Label.toMeasure.push(label);
  };
  Label.endMeasuring = function(cb) {
    var measuring = Label.measuring;
    var toMeasure = Label.toMeasure;
    Label.measuring = null;
    Label.toMeasure = [];

    setTimeout(Label.measureAll.bind(null, measuring, toMeasure, cb), 0);
    //Label.measureAll(measuring, toMeasure, cb);
  };
  Label.measureAll = function(measuring, toMeasure, cb) {
    for (var i=0; i<toMeasure.length; i++) {
      var label = toMeasure[i];
      var bbox = label.el.getBBox();
      label.width = (bbox.width + 0.5) | 0;
    }
    document.body.removeChild(measuring);
    cb();
  };


  /* Icon */

  var Icon = function(name) {
    this.name = name;

    var info = Icon.icons[name];
    this.width = info.width;
    this.height = info.height;
  };
  Icon.icons = {
    greenFlag: { width: 20, height: 21 },
    turnLeft: { width: 15, height: 12 },
    turnRight: { width: 15, height: 12 },
  };
  Icon.prototype.draw = function() {
    return symbol('#' + this.name, {
      width: this.width,
      height: this.height,
    });
  };


  /* Input */

  var Input = function(shape, value) {
    this.shape = shape;
    this.value = value;

    this.label = new Label(value, ['literal-' + this.shape]);
    this.x = 0;
  };

  Input.prototype.draw = function(parent) {
    var label = this.label.draw();
    var lw = this.label.width;
    var classList = ['input', 'input-'+this.shape];
    var children = [];
    if (this.shape !== 'color' && this.shape !== 'boolean') {
      children.push(label);
    }
    var darker = false;
    switch (this.shape) {
      case 'number':
        var w = Math.max(14, lw + 9);
        var h = 13;
        var el = roundedRect(w, h);
        var lx = 5;
        var ly = 0;
        break;

      case 'string':
        var w = Math.max(14, lw + 6);
        var h = 14;
        var lx = 4;
        var ly = 1;
        var el = rect(w, h);
        break;

      case 'dropdown':
        var w = Math.max(14, lw + 19);
        var h = 14;
        var lx = 4;
        var ly = 1;
        var el = setProps(group([
          setProps(rect(w, h), {
            class: [parent.info.category, 'darker'].join(' '),
          })
        ]), { width: w, height: h });
        children.push(translate(lw + 9, 5, polygon({
          points: [
            P(7, 0), 
            P(3.5, 4),
            P(0, 0),
          ],
          fill: 'rgba(0,0,0, 0.6)',
        })));
        break;

      case 'number-dropdown':
        var w = Math.max(14, lw + 16);
        var h = 13;
        var el = roundedRect(w, h);
        var lx = 5;
        var ly = 0;
        children.push(translate(lw + 6, 4, polygon({
          points: [
            P(7, 0), 
            P(3.5, 4),
            P(0, 0),
          ],
          fill: 'rgba(0,0,0, 0.6)',
        })));
        break;

      case 'color':
        var w = 13;
        var h = 13;
        var el = rect(w, h, {
          fill: this.value,
        });
        break;

      case 'boolean':
        var w = 30;
        var h = 14;
        var el = group([
          setProps(pointedRect(w, h), {
            class: [parent.info.category, 'darker'].join(' '),
          })
        ]);
        break;
    }
    this.width = w;
    this.height = h;
    translate(lx, 0, label);

    return group([
      setProps(el, {
        class: classList.join(' '),
      }),
    ].concat(children));
  };

  Input.fromJSON = function(shape, value) {
    // TODO decode _mouse etc
    return new Input(shape, value);
  };

  Input.fromAST = function(input) {
    if (input.pieces.length > 1) throw "ahh";
    return new Input(input.shape, input.pieces[0]);
  };



  /* Block */

  var Block = function(info, children) {
    this.info = info;
    this.children = children;

    var shape = this.info.shape;
    this.isHat = shape === 'hat';
    this.hasPuzzle = shape === 'stack' || shape === 'hat';
    this.isFinal = /cap/.test(shape);
    this.isCommand = shape === 'stack' || shape === 'cap';
    this.isReporter = shape === 'boolean' || shape === 'reporter' || shape === 'embedded';
    this.isBoolean = shape === 'boolean';
    this.hasScript = /block/.test(shape);

    this.x = 0;
  };

  Block.prototype.drawSelf = function(w, h) {
    var func = {
      stack: stackRect,
      cap: capRect,
      reporter: roundedRect,
      embedded: roundedRect,
      boolean: pointedRect,
      hat: hatRect,
      // 'c-block': TODO
      // 'c-block cap': TODO
      // 'if-block': TODO
    }[this.info.shape];
    if (!func) throw "no shape func: " + this.info.shape;
    return func(w, h, {
      class: [this.info.category, 'bevel'].join(' '),
    });
  };

  Block.prototype.draw = function() {
    var x = 0;
    var h = 16;
    var minWidth = this.isCommand ? 39 : 0;

    for (var i=0; i<this.children.length; i++) {
      var child = this.children[i];
      child.el = child.draw(this);

      if (x) {
        x += 4;
        if (child.constructor === Input && x < 24) {
          x = 24;
        }
        // TODO padding between join's inputs
      }
      child.x = x;
      x += child.width;
      if (child.constructor !== Label) {
        h = Math.max(h, child.height);
      }
    }

    switch (this.info.shape) {
      case 'hat':
        var pt = 13, px = 6, pb = 2;
        break;
      case 'reporter':
      case 'embedded':
        var pt = 3, px = 4, px2 = 9, pb = 1;
        break;
      case 'boolean':
        var pt = 3, px = 8, px2 = 12, pb = 2;
        // TODO scale padding based on size?
        break;
      case 'cap':
        var pt = 6, px = 6, pb = 2;
        break;
      default:
        var pt = 4, px = 6, pb = 2;
    }
    var pl = px;
    var pr = px;
    if (this.children[0].constructor === Label) pl = px2 || px;
    if (child.constructor === Label) pr = px2 || px;

    this.height = h + pt + pb;
    this.width = Math.max(minWidth, x + pl + pr);

    var objects = [];
    for (var i=0; i<this.children.length; i++) {
      var child = this.children[i];
      var y = pt + (h - child.height - 2) / 2;
      translate(pl + child.x, y, child.el);
      objects.push(child.el);
    }

    objects.splice(0, 0, this.drawSelf(this.width, this.height));

    return group(objects);
  };

  Block.fromJSON = function(arr) {
    var selector = arr[0];
    var info = Scratch.blocksBySelector[selector];
    var args = arr.slice(1).map(function(arg, index) {
      var input = info.inputs[index];
      if (arg && arg.constructor === Array) {
        return (input === undefined ? Script : Block).fromJSON(arg);
      } else {
        return Input(input, arg);
      }
    });
    var children = [];
    for (var i=0; i<info.parts.length; i++) {
      var part = info.parts[i];
      if (Scratch.inputPat.test(part)) {
        children.push(args.shift());
      } else {
        children.push(new Label(part));
      }
    }
    return new Block(info, children);
  };

  Block.fromAST = function(block) {
    if (block.type === 'cwrap') {
      block = block.contents[0];
      // TODO cwrap
    }
    var info = {
      // spec: spec,
      // parts: spec.split(inputPat),
      shape: block.shape,
      category: block.category,
      // selector: command[3],
      // defaults: command.slice(4),
      // inputs: 
    };
    if (block.pieces.length === 0) {
      block.pieces = [""];
    }
    var children = block.pieces.map(function(piece) {
      if (/^ *$/.test(piece)) return;
      if (piece === '@') {
        var symbol = {
          'green-flag': 'greenFlag',
          'arrow-cw': 'turnRight',
          'arrow-ccw': 'turnLeft',
        }[block.image_replacement];
        return new Icon(symbol);
      }
      if (typeof piece === 'string') return new Label(piece);
      switch (piece.shape) {
        case 'number':
        case 'string':
        case 'dropdown':
        case 'number-dropdown':
        case 'color':
          return Input.fromAST(piece);
        // TODO <>
        default:
          if (piece.shape === 'boolean' && piece.blockid === '') {
            return Input.fromAST(piece);
          }
          return Block.fromAST(piece);
      }
    });
    children = children.filter(function(x) { return !!x; });
    return new Block(info, children);
  };


  /* Script */

  var Script = function(blocks) {
    this.blocks = blocks;
  };

  Script.prototype.draw = function() {
    var children = [];
    var y = 0;
    this.width = 0;
    for (var i=0; i<this.blocks.length; i++) {
      var block = this.blocks[i];
      children.push(translate(0, y, block.draw()));
      y += block.height;
      this.width = Math.max(this.width, block.width);
    }
    this.height = y;
    if (!/cap/.test(block.shape)) {
      this.height += 3;
    }
    return group(children);
  };

  Script.fromAST = function(blocks) {
    return new Script(blocks.map(Block.fromAST));
  };

  /*****************************************************************************/


  function scriptsToSVG(results, cb) {
    Label.startMeasuring();

    // walk AST
    var scripts = [];
    for (var i=0; i<results.length; i++) {
      scripts.push(Script.fromAST(results[i]));
    }

    // measure strings
    Label.endMeasuring(drawScripts.bind(null, scripts, cb));
  }

  function drawScripts(scripts, cb) {
    // render each script
    var width = 0;
    var height = 0;
    var elements = [];
    for (var i=0; i<scripts.length; i++) {
      var script = scripts[i];
      if (height) height += 10;
      elements.push(translate(0, height, script.draw()));
      height += script.height;
      width = Math.max(width, script.width);
    }

    // return SVG
    var svg = newSVG(width, height);
    svg.appendChild(withChildren(el('defs'), [
        makeStyle(),
        bevelFilter('bevelFilter', false),
        bevelFilter('inputBevelFilter', true),
        darkFilter('inputDarkFilter'),
    ].concat(makeIcons())));

    window.svg = svg; // DEBUG

    svg.appendChild(group(elements));
    cb(svg);
  }

  function exportXML(svg) {
    return new XMLSerializer().serializeToString(svg);
  }


  return sb2; // export the module
}();
