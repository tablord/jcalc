  // global variables /////////////////////////////////////////////////

  var jc = {name:'JCalc',
            version:'0.1',
            authors:['Marc Nicole'],
            codeElementBeingExecuted:undefined,
            selectedElement:undefined,
            output: {}, //a new Output is created for each code. 
                        //it hold both the code and output Elements as well as the htlm
                        //at init an empty object so _codeElement and _outputElement are undefined
            traces:[],
            tracesMaxLength:100,
            localToolBar:undefined,
            htmlIndent:1,
            simulation:undefined, // will be set by StateMachine.js
            blockNumber:0,
            finalizations:[],     // a stack of output to be finalized

            errorHandler:function(message,url,line) {
                var out  = jc.output._outputElement;
                if (out) {
                  if (url) {
                    out.innerHTML = message+'<br>'+url+' line:'+line+'<br>'+trace.span();
                  }
                  else {
                    var tag = (out.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
                    var code = jc.errorHandler.code || '';
                    var faults = message.match(/� (.+?) �/);
                    if (faults != null) {
                      var fault = faults[1];
                      code = code.replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
                    }
                    out.innerHTML = trace.span()+message+'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>';
                  }
                  $(out).removeClass('SUCCESS').addClass('ERROR');
                  out.scrollIntoView();
                  return true;
                }
              return false;
            }
           };


  jc.credits = {name:jc.name,version:jc.version,authors:jc.authors};
  jc.helps = {credits:jc.credits};

  //JQuery extentions /////////////////////////////////////////////////
  $.prototype.span = function() {
    var s = [];
    for (var i=0; i < this.length; i++) {
      s.push(i+': <code class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(this[i].outerHTML)))+'</code>');
    }
    return new HTML('JQuery of '+this.length+' elements<br>'+s.join('<br>'));
  }  

  // edi related functions ////////////////////////////////////////////
  var geval = eval;

  jc.securedEval = function(code) {
  // NRT0001
  // a bit more secured: since IE<9 executes localy, it was possible do destroy local variable by defining functions or var
  // with this trick, one can still create global variables by just assigning (eg: v='toto' destroys the global variable v
  // to be checked what could be done to improve

    jc.errorHandler.code = code;
    code = 'var output = jc.output; with (v) {'+code+'};';   //output becomes a closure, so finalize function can use it during finalizations
    return geval(code)
  }


  // debug //////////////////////////////////////////////////////////



  function a(/*messages*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += jc.inspect(arguments[i]);
    }
    window.alert(message);
  }


  function trace(/*messages*/) {
    var message = '';
    for (var i=0; i<arguments.length; i++){
      message += jc.htmlView(arguments[i]);
    }
    jc.traces.push(message);
    if (jc.traces.length > jc.tracesMaxLength) {
      jc.traces.pop();
      jc.traces[0]='...';
    }
  }

  trace.span = function () {
    if (jc.traces.length > 0){
      var h = '<DIV class=TRACE>'+jc.traces.length+' traces:<table class=DEBUG><tr><td class=TRACE>'+jc.traces.join('</td></tr><tr><td class=TRACE>')+'</td></tr></table></DIV>';
      jc.traces = [];
      return new HTML(h);
    }
    return '';
  }

  

  // Inspector ////////////////////////////////////////////////////////
  jc.Inspector = function(obj,name,depth) {
    this.obj = obj;
    this.name = name || '';
    this.depth = depth || 1;
  }
  
  jc.Inspector.prototype.legend = function(obj) {
    // returns the legend for a given object
    var l;
    if ($.isPlainObject(this.obj)) {
      l = '{}';
    }
    else if ($.isArray(this.obj)) {
      l = '[]';
    }
    else if ($.isFunction(this.obj)) {
      l = jc.signature(this.obj);
    }
    else {
      l = this.obj.toString();
    } 
    return l;
  }

  jc.Inspector.prototype.toString = function (){
    var r = this.legend(this.obj)+' '+this.name+'\n';
    for (var k in this.obj) { r += k+':  '+this.obj[k]+'\n' };
    return r;
  }

  jc.Inspector.prototype.span = function (depth){
    depth = depth || this.depth;
    if (typeof this.obj == 'string') {
      return '<SPAN class=INSPECT>'+jc.toHtml(this.obj)+'</SPAN>';
    }
      
    var r = '<DIV class=INSPECT><fieldset><legend>'+this.legend(this.obj)+' '+this.name+'</legend>';
    r += '<table class=INSPECT>';
    for (var k in this.obj) {
      r += '<tr><th valign="top">'+k+'</th><td valign="top" style="text-align:left;">'+
           (  (typeof this.obj[k] == 'function')?jc.help(this.obj[k]):
                 ((depth == 1)?jc.toHtml(this.obj[k]):jc.inspect(this.obj[k]).span(depth-1))
           )
          +'</td></tr>'; 
    };
    return new HTML(r+'</table></fieldset></DIV>');
  }

  jc.inspect = function(obj,name,depth){
    return new jc.Inspector(obj,name,depth);
  }

  // general purpose helpers ////////////////////////////////////////////

  jc.keys = function(obj) {
    var res = [];
    for (var k in obj) {
      res.push(k);
    }
    return res;
  }

  jc.copy = function(obj) {
    // makes a copy of obj this version only copies the first level
    // does not copy any inheritance (result is an Object instance)
    var o = {};
    for (var k in obj) {
      o[k] = obj[k]
    }
    return o;
  }

  jc.pad = function(integer,numberOfDigits){
    return ('00000000000000000'+integer).slice(-numberOfDigits);
  }

  jc.purgeJQueryAttr = function(html) {
    // supress all jqueryxxx="yy" attributes, since they are meaningless for the user and also compromise the testability
    // since they depend on the context

    var reg = /(.*?)(<.+?>)/g;
    var res,lastIndex=0;
    var result = '';
    while ((res = reg.exec(html)) != null) {
      result += res[1]+res[2].replace(/\s*?jQuery\d+="\d"/g,'');
      lastIndex = res.lastIndex;
    };
    return result;
  }

  jc.toString = function(html) {
    // transform the content (from innerHTML) to a string as if this content is a text editor
    // removes any tags other than <BR> and <P>
    var res = html
              .replace(/<BR>/g,'\n')
              .replace(/<P>/g,'\n\n')
              .replace(/<.+?>/g,"")
              .replace(/&nbsp;/g," ")
              .replace(/&lt;/g,"<")
              .replace(/&gt;/g,">")
              .replace(/&amp;/g,"&");
    return res;
  }

  jc.toHtml = function(code) {
    // transform htmlCode in such a manner that the code can be visualised in a <code>...
    return String(code)
             .replace(/&/g,"&amp;")
             .replace(/</g,"&lt;")
             .replace(/>/g,"&gt;")
             .replace(/ /g,"&nbsp;")
             .replace(/\r/g,'')
             .replace(/\n/g,"<br>");
  }

  jc.codeExample = function(example) {
    return new HTML('<span class=CODEEXAMPLE>'+example+'</span>');
  }

  jc.trimHtml = function(html) {
  // suppress all unsignificant blanks and non visible char
    return html.replace(/[ \t\r\n]+/g,' ').replace(/> /,'>').replace(/ </,'<');
  }

  jc.textContent = function(html) {
  // return the text like textcontent that doesn't exist in IE7
  // first remove all tags having HIDDEN in class and then keeps the text only
  // TODO******** not ok for nested tags !!!! ********************************
    return html.replace(/\<.*?style\="DISPLAY\: none".*?\<\/.*?\>/g,'').replace(/\<.*?\>/g,'');
  }

  jc.findInArrayOfObject = function(criteria,a) {
    // find the first object in the array of object a that has all criteria true
    // example jc.findInArrayOfObject({toto:5},[{toto:1,tutu:5},{toto:5}])
    // will return 1
    next: for (var i=0; i<a.length; i++) {
      for (var k in criteria) {
        if (a[i][k] !== criteria[k]) continue next;
      }
      return i;
    }
  }
    

  jc.help = function(func) {
  // returns the signature of the function and the first comment in a pretty html 
  // - func: the function to be inspected
  // if func is undefined returns all helps of all installed modules
    if (func == undefined) {
      var h = '';
      for (var module in jc.helps) {
        h += jc.inspect(jc.helps[module],module).span();
      }
      return new HTML(h);
    }

    var source = func.toString().split('\n');
    var comments = []
    var signature = source[0].match(/(function.*?\))/)[0];
    for (var i=1; i<source.length; i++) {
      var comment = source[i].match(/^\s*\/\/(.*)$/);
      if (comment && (comment.length ==2)) {
        comments.push(jc.toHtml(comment[1]));
      }
      else break;
    }
    return new HTML('<b>'+signature+'</b><br>'+comments.join('<br>'));
  }

  jc.signature = function(func) {
    // returns only the signature of the function
    return func.toString().match(/(function.*?\))/)[0];
  }

  // navigation within document ////////////////////////////////////////////////////////
  jc.sectionBeingExecuted$ = function() {
    // returns a jQuery containing the deepest section that contains the code currently in execution
    return $(jc.currentElementBeingExecuted).closest('.SECTION');
  }

  jc.testStatus = function() {
    // set a finalize function that will write to the current output the number of test Failure
    // in the section that includes the code that executes this function
    // mostly used in a small code inside the title of a section to summerize the tests below
    var output = jc.output; // closure on jc.output
    output.finalize(function(){
      var section = $(output._codeElement).closest('.SECTION');
      var numberOfSuccess= section.find('.TEST.SUCCESS').length;
      var numberOfErrors = section.find('.TEST.ERROR').length;
      output.html(
        '<SPAN class='+(numberOfErrors==0?'SUCCESS':'ERROR')+'>tests passed:'+numberOfSuccess+' failed:'+numberOfErrors+'</SPAN>'
      )}
    );
  }

  
  // Table of Content //////////////////////////////////////////////////////////////////
  jc.tableOfContent = {
    toc : [],
    updateSections : function (element) {
      var currentNumbers = [];
      this.toc = [];
      $('.SECTION').each(function (i,e) {
        if ($(e).hasClass('DELETED')) return;
        var title = e.firstChild;
        var level = Number(title.tagName.slice(1))-1;
        currentNumbers[level] = (currentNumbers[level] || 0)+1;
        currentNumbers.length = level+1;
        var number = currentNumbers.join('.');
        var t = title.innerHTML.replace(/^[\d\.]*(\s|\&nbsp;)*/,'');
        title.innerHTML = number+' '+t;
        jc.tableOfContent.toc.push({number:number,title:jc.textContent(t),sectionId:e.id});
      });
    },
    find : function(title) {
      return this.toc[jc.findInArrayOfObject({title:title},this.toc)];
    },
    span : function() {
      var t = table();
      t.addRows(this.toc);
      return t.span();
    }
  };
    
  jc.link = function(text,url) {
    // if no url is given, text is used as a search into table of content to find the section
    // TODO: futur version will accept http url
    url = url || text;
    var entry = jc.tableOfContent.find(url);
    if (entry) {
      return new HTML('<a href="#'+entry.sectionId+'">'+text+'</a>');
    }
    return new HTML('<span class=INVALIDLINK title="#'+url+' is not found in the table of content">'+text+'</span>');
  }


  // EDI ///////////////////////////////////////////////////////////////////////////////

  jc.richedit = {
    exec:      function(command,value) {window.document.execCommand(command,false,value || null)},
    bold:      function(){jc.richedit.exec('bold')},
    italic:    function(){jc.richedit.exec('italic')},
    underline: function(){jc.richedit.exec('underline')},
    strike:    function(){jc.richedit.exec('strikeThrough')},
    h1:        function(){jc.richedit.exec('formatBlock','<h1>')},
    h2:        function(){jc.richedit.exec('formatBlock','<h2>')},
    div:       function(){jc.richedit.exec('formatBlock','<div>')},
    p:         function(){jc.richedit.exec('formatBlock','<p>')},
    ol:        function(){jc.richedit.exec('insertOrderedList')},
    ul:        function(){jc.richedit.exec('insertUnorderedList')},
    pre:       function(){jc.richedit.exec('formatBlock','<pre>')}
  }

  jc.findblockNumber = function() {
    $('.CODE').each(function(i,e) {
      var n = Number(e.id.slice(4));
      if (!isNaN(n)) {
        jc.blockNumber = Math.max(jc.blockNumber,n);
      }
    });
    jc.blockNumber++;
  }

  jc.blockId = function(prefix) {
    return prefix+jc.pad(jc.blockNumber,4);
  }

  jc.removeErrors = function(html) {
    return html.replace(/<SPAN class\=ERROR>(.+?)<\/SPAN>/g,"$1")
  }
               

  jc.outputElement = function(element) {
    // return the output element associated with element if any
    // if applied on another element than id=codexxxx return undefined;
    if (element.id.slice(0,4) !== 'code') return;
    var outId = element.id.replace(/code/,"out");
    var out = window.document.getElementById(outId);
    if (out == undefined) {
      var tag = (element.tagName=='SPAN'?'SPAN':'DIV');
      out = $('<'+tag+' class=OUTPUT id='+outId+'>no output: created on the fly</'+tag+'>')[0];
      $(out).insertAfter(element);
    }
    return out;
  }

  jc.testElement = function(element) {
    // returns the test element if any
    // if applied on another element than id=codexxxx return undefined;
    if (element.id.slice(0,4) !== 'code') return;
    return window.document.getElementById(element.id.replace(/code/,"test"));
  }

  jc.initLocalToolBar = function() {
    jc.localToolBar = $('#localToolBar')[0];  // start with localToolBar hidden so that its position is irrelevent
    if (jc.localToolBar == undefined) {
      jc.localToolBar = window.document.createElement('DIV');
      jc.localToolBar.id='localToolBar';
      window.document.body.insertBefore(jc.localToolBar,window.document.body.lastChild);
    }
    $(jc.localToolBar).addClass('HIDDEN');
    jc.localToolBar.innerHTML = 
      '<BUTTON onclick=jc.insertNewSection(jc.localToolBar);>^ new section ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewRichText(jc.localToolBar);>^ new richtext ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewCodeBlock(jc.localToolBar);>^ new code ^</BUTTON>'+
      '<SPAN id=codeId>no element</SPAN>'+
      '<INPUT onclick="$(\'.CODE\').toggleClass(\'HIDDEN\',this.checked);this.scrollIntoView();" type=checkbox>hide codes</INPUT>'+
      '<INPUT onclick="$(\'.DELETED\').toggleClass(\'HIDDEN\',this.checked);this.scrollIntoView();" type=checkbox>hide deleted</INPUT>'+
      '<INPUT onclick="$(\'.TEST\').toggleClass(\'HIDDEN\',this.checked);" type=checkbox>hide tests</INPUT>'+
      '<INPUT onclick="$(\'.TRACE\').toggleClass(\'HIDDEN\',this.checked);" type=checkbox>hide traces</INPUT>'+
      '<BUTTON onclick=jc.hideToolBars();>hide ToolBars</BUTTON>'+
      '<DIV class=RICHEDITTOOLBAR style="float:left;">'+
        '<BUTTON onclick=jc.richedit.bold();><b>B</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.italic();><i>i</i></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.underline();><U>U</U></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.strike();><strike>S</strike></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.h1();><b>H1</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.h2();><b>H2</b></BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.div();>div</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.p();>&#182;</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.ol();>#</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.ul();>&#8226;</BUTTON>'+ 
        '<BUTTON onclick=jc.richedit.pre();>{}</BUTTON>'+ 
      '</DIV>'+
      '<DIV>'+
        '<BUTTON onclick=jc.execAutoExec();>run</BUTTON>'+
        '<BUTTON onclick=jc.execAll();>run all</BUTTON>'+
        '<BUTTON onclick=jc.showOutputHtml(this);>show html</BUTTON>'+
        '<BUTTON onclick=jc.copyOutputToTest(this);>--&gt;test</BUTTON>'+
        '<BUTTON onclick=jc.toggleAutoExec();>autoexec</BUTTON>'+
        '<BUTTON onclick=jc.save();>save</BUTTON>'+
        '<BUTTON onclick=jc.deleteBlock(jc.selectedElement);>V delete V</BUTTON>'+
      '</DIV>';
  }

  jc.initBottomToolBar = function (section) {
    // makes sure that the last element of the section is a bottom tool bar
    // if section is undefined, the document body is used 
    // if needed a new bottomToolBar is created

    section = section || window.document.body
    var bottomToolBar = section.lastChild;
    if ((bottomToolBar == undefined) || (! $(bottomToolBar).hasClass('BOTTOMTOOLBAR'))) {
      bottomToolBar = window.document.createElement('DIV');
      bottomToolBar.className = 'BOTTOMTOOLBAR';
      section.appendChild(bottomToolBar);
    }
    bottomToolBar.innerHTML = 
      '<BUTTON onclick=jc.insertNewSection(this.parentNode);>^ new section ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewRichText(this.parentNode);>^ new rich text ^</BUTTON>'+
      '<BUTTON onclick=jc.insertNewCodeBlock(this.parentNode);>^ new code ^</BUTTON>';
  }

  jc.save = function() {
    // save the sheet under fileName or the current name if fileName is not specified
    var fileName = window.prompt('save this sheet in this file?',window.location.pathname);
    if (fileName == undefined) return;

    jc.removeDeletedBlocks();
    jc.selectElement(undefined);
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.OpenTextFile(fileName,2,true);
    file.Write(window.document.documentElement.outerHTML);
    file.Close();
    window.alert(fileName+' saved');
  }

  jc.copyOutputToTest = function() {
    var out = jc.outputElement(jc.selectedElement);
    var test = jc.testElement(jc.selectedElement);
    if (test == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id="'+jc.selectedElement.id.replace(/code/,"test")+'" class=TEST>'+out.innerHTML+'</DIV>');
    }
    else {
      test.innerHTML = out.innerHTML;
      $(test).removeClass('ERROR').addClass('SUCCESS');
    }
  }

  jc.deleteBlock = function(element,del) {
    del = del || !$(element).hasClass('DELETED');
    $(element)
    .add(jc.outputElement(element))
    .add(jc.testElement(element))
    .find('*')
    .andSelf()
    .toggleClass('DELETED',del);
  }

  jc.removeDeletedBlocks = function() {
    $('.DELETED').remove();
  }

  jc.insertNewCodeBlock = function(beforeThatElement) {
    // insert a new code and output DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)

    jc.blockNumber++;
    var newCode = window.document.createElement('<PRE onclick=jc.selectElement(this); class=CODE id='+jc.blockId('code')+' contentEditable=true>');
    var newOutput = window.document.createElement('<DIV class="OUTPUT OLD" onclick=jc.outClick(this) id='+jc.blockId('out')+'>');
    newOutput.innerHTML='no output';
    beforeThatElement.parentNode.insertBefore(newCode,beforeThatElement);
    beforeThatElement.parentNode.insertBefore(newOutput,beforeThatElement);
    $(newCode).bind("keypress",undefined,jc.editorKeyPress);
    jc.selectElement(newCode);
  }

  jc.insertNewRichText = function(beforeThatElement) {
    // insert a new richText DIV 
    // -beforeThatElement is where it must be inserted (usually the localToolBox, but can be any Element)
    jc.blockNumber++;
    var newRichText = window.document.createElement('<DIV id='+jc.blockId('rich')+' class=RICHTEXT onclick=jc.selectElement(this); contentEditable=false>');
    $(newRichText).bind("keypress",undefined,jc.richTextKeyPress);
    beforeThatElement.parentNode.insertBefore(newRichText,beforeThatElement);
    jc.selectElement(newRichText);
  }

  jc.insertNewSection = function(beforeThatElement) {
    //insert a new section that consist of one title and one div as futur container of embeeded elements
    //a bottomToolBar is added in the container
    
    jc.blockNumber++;
    var currentLevel = 1;
    if (beforeThatElement.parentNode != window.document.body) {
      var parentSectionTitle = beforeThatElement.parentNode.previousSibling;
      var tag = parentSectionTitle.tagName;
      if (tag.slice(0,1) === 'H') {
        currentLevel = Number(tag.slice(1))+1;
      }
    }
    var newSection = window.document.createElement('<DIV id='+jc.blockId('sect')+' class=SECTION>');
    var title = window.document.createElement('<H'+currentLevel+' class=SECTIONTITLE onclick=jc.selectElement(this.parentNode); contentEditable=true>');
    var container = window.document.createElement('<DIV class=SECTIONCONTAINER>');
    newSection.appendChild(title);
    newSection.appendChild(container);
    beforeThatElement.parentNode.insertBefore(newSection,beforeThatElement);
    jc.initBottomToolBar(container);
    jc.tableOfContent.updateSections();
    jc.selectElement(newSection);
  }

  jc.editorKeyPress = function(event) {
    var element = event.srcElement;
    $(element.id.replace(/code/,"#out")).removeClass('SUCCESS').removeClass('ERROR');
    $(element.id.replace(/code/,"#test")).removeClass('SUCCESS').removeClass('ERROR');
    if (event.keyCode==10) {  //only IE
      jc.execAutoExec(); 
    }
  }

  jc.richTextKeyPress = function(event) {
    var element = event.srcElement;
    if (event.keyCode==10) {  //only IE
      jc.execAutoExec(); 
    }
  }

  jc.moveLocalToolBar = function(element) {
    var localToolBar = $(jc.localToolBar).removeClass("HIDDEN")[0];
    element.parentNode.insertBefore(localToolBar,element);
    window.document.getElementById('codeId').innerHTML = element.id;
  }

  jc.$editables = function(element) {
    // returns a JQuery of the tags that are editable in element
    if ($(element).hasClass('SECTION')) return $(element.firstChild);
    return $(element);
  }

  jc.hideToolBars = function() {
    $('.BOTTOMTOOLBAR').add(jc.localToolBar).addClass('HIDDEN');
  }

  jc.selectElement = function(element) {
    var e = jc.selectedElement;
    if (e === element) {
      e.focus();
      return;
    }
    $(e).removeClass('SELECTED');
    jc.$editables(e)
    .attr('contentEditable',false)
    .each(function(i,e){jc.reformatRichText(e)});
    $('.BOTTOMTOOLBAR').addClass('HIDDEN');
    jc.selectedElement = element;
    if (element == undefined){
      $(jc.localToolBar).addClass('HIDDEN');
      return;
    }

    jc.moveLocalToolBar(element);
    $(element).addClass('SELECTED');
    jc.$editables(jc.selectedElement).attr('contentEditable',true);
    element.focus();
    //show only the necessary BottomToolBars
    while (element != null) {
      if ($(element).hasClass('SECTION')){
        $(element.lastChild.lastChild).removeClass('HIDDEN');
      }
      element = element.parentNode;
    }
    $(window.document.body.lastChild).removeClass('HIDDEN');
  }

  jc.outClick = function(element) {
    var code = window.document.getElementById(element.id.replace(/out/,"code"))
    jc.execCode(code);
  }


  jc.htmlView = function(obj) {
    if (obj == undefined) {
      return '<SPAN style=color:red;>undefined</SPAN>';
    }
    if (obj == '') {
      return '<SPAN style=color:red;>empty string</SPAN>';
    }
    if (typeof obj == 'function') {
      return jc.help(obj);
    }
    if (obj.span) {
      return obj.span();
    }
    if (obj.outerHTML) { // an Element
      return 'DOM Element<SPAN class="INSPECTHTML">'+jc.toHtml(jc.trimHtml(jc.purgeJQueryAttr(obj.outerHTML)))+'</SPAN>';
    }
    if (obj == '[object Object]') {
      return jc.inspect(obj).span();
    }
    if (obj.valueOf) {
      return obj.valueOf();
    }
    return jc.toHtml(obj); 
  }

  jc.displayResult = function(result,out) {
//    try {
      out.innerHTML = trace.span()+jc.htmlView(result);
      $(out).removeClass('ERROR').addClass('SUCCESS');
/*    }
    catch (e) {
      e.code='displayResult>'
      jc.displayError(e,out);
    }
*/
  }

  jc.displayError = function(error,out) {
    if (error.message) {
      var faults = error.message.match(/� (.+?) �/);
      if (faults != null) {
        var fault = faults[1];
        var code = (error.code || '').replace(new RegExp(fault,'g'),'<SPAN class="ERROR">'+fault+'</SPAN>');
      }
      error = error.name+': '+error.message;
    }
    var tag = (out.tagName=='SPAN')?'SPAN':'PRE';  // if span, one can only insert span, not div
    out.innerHTML = trace.span()+error+(code?'<'+tag+' class="CODEINERROR">'+code+'</'+tag+'>':'');
    $(out).removeClass('SUCCESS').addClass('ERROR');
  }


  jc.execCode = function(element) {
    if ($(element).hasClass('DELETED')) return;

    var out  = jc.outputElement(element);
    var test = jc.testElement(element)
    jc.output = newOutput(element,out);
    var res = jc.securedEval(jc.toString(element.innerHTML));
    jc.displayResult(res,out);
    // test
    if (test != undefined) {
      if (jc.trimHtml(out.innerHTML) == jc.trimHtml(test.innerHTML)) {   //TODO rethink how to compare
        $(test).removeClass('ERROR').addClass('SUCCESS');
      }
      else {
        $(test).removeClass('SUCCESS').addClass('ERROR');
      }
    }
  }

  jc.finalize = function() {
    for (var i=0;i<jc.finalizations.length;i++) {
      var out = jc.finalizations[i];
      jc.errorHandler.code = out._finalize+''; 
      out._finalize();
      out._finalize = undefined;  // so that displayResult will not show ... to be finalized...
      jc.displayResult(out,out._outputElement);
    }
  }

  jc.execAll = function() {
    jc.finalizations = [];
    jc.tableOfContent.updateSections();
    jc.$editables(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').each(function(i,e) {jc.execCode(e);});
    jc.finalize();
  }

  jc.execAutoExec = function() {
    jc.finalizations = [];
    jc.tableOfContent.updateSections();
    jc.$editables(jc.selectedElement).each(function(i,e){jc.reformatRichText(e)});
    $('.CODE').each(function(i,e) {
      if ($(e).hasClass('AUTOEXEC') || (e==jc.selectedElement)) {
        jc.execCode(e);
      }
    })
    jc.finalize();
  }

  jc.reformatRichText = function(element) {
    if ((element == undefined) || ($(element).hasClass('CODE'))) return;
    var mark = /\{\{[#]?(.*?)\}\}/;
    var h = element.innerHTML;
    var idx=-1;
    while ((idx=h.search(mark))!=-1) {
      jc.blockNumber++;
      if (h.charAt(idx+2) == '#') {
        h = h.replace(mark,'<SPAN class="CODE AUTOEXEC" id='+ jc.blockId('code')+' style="DISPLAY: none;">jc.link("$1")</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
      }
      h = h.replace(mark,'<SPAN class="CODE AUTOEXEC" id='+ jc.blockId('code')+' style="DISPLAY: none;">$1</SPAN><SPAN class=OUTPUT contentEditable=false id='+ jc.blockId('out')+'>no output</SPAN>');
    }
    element.innerHTML = h;
  }

  jc.showOutputHtml = function(checkBox) {
    var outHtmlId = 'html'+jc.selectedElement.id;
    var outHtml = window.document.getElementById(outHtmlId);
    if (!checkBox.checked && outHtml) {
      outHtml.outerHTML = '';
    }
    var out = jc.outputElement(jc.selectedElement) || jc.selectedElement;
    if (outHtml == undefined) {
      out.insertAdjacentHTML('afterend','<DIV id='+outHtmlId+' class=DEBUG>html</DIV>');
      var outHtml = window.document.getElementById(outHtmlId);
    }
    outHtml.innerHTML = jc.toHtml(out.innerHTML);
  }

  jc.toggleAutoExec = function() {
    $(jc.selectedElement).toggleClass("AUTOEXEC");
  }



  window.attachEvent('onload',function () {
    $('.SELECTED').removeClass('SELECTED');
    $('.CODE').bind("keypress",undefined,jc.editorKeyPress);
    $('.RICHTEXT').bind("keypress",undefined,jc.richTextKeyPress);
    $('.OUTPUT').removeClass('SUCCESS').removeClass('ERROR');
    $('.TEST').removeClass('SUCCESS').removeClass('ERROR');
    jc.findblockNumber();
    jc.initLocalToolBar();
    jc.initBottomToolBar();
  });  
  
  window.onerror = jc.errorHandler;
