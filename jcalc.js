
  // jcalc library /////////////////////////////////////////////////////
    
  
  // calcul ///////////////////
  function V(name,value) {
    //constructor for a new instance of V
    //rarely use it directly, but use the v() function instead that also register the variable
    //in the v namespace
    this.setName(name);
    this.setValue(value);
  }

  V.prototype.setName = function(name) {
    // for internal use only
    // changes the name of the variable and also
    // updates ._label and ._unit
    if (name == undefined) return;

    this._name =name;
    var lu = name.match(/(^.+)\$(.+)/)
    if (lu != null) {
      this._label = lu[1];
      this._unit  = lu[2];
    }
  }

  V.prototype.setValue = function(value){
    if (typeof value == "function") {
      this._func =value;
    }
    else {
      this._value=value;
      this._func = undefined;
    }
  }

  V.prototype.label = function() {
    // return the label (= variable name without the units)
    return '<var>'+(this._label || this._name)+'</var>';
  }

  V.prototype.unit = function() {
    // return the units of the variable
    return this._unit?'<span class=UNIT>'+jc.Units.symbole(this._unit)+'</span>':'';
  }
 
  V.prototype.valueOf = function () {
    // return the value of the variable
    // if the variable is in fact a function, executes the function and return its value
    if (this._func) {
      return this._func(this._row,this._col);
    }
    if (this._value == undefined) {
      this._error = "Error in "+this._name+'> _value is undefined';
      throw new Error(this._error);
    }
    return this._value;
  }
 
  V.prototype.to = function(unit) {
    // return the value converted to unit
    return jc.Units.convert(this.valueOf(),this._unit,unit);
  }

  V.prototype.toString = function() {
    // return the summary of the variable
    return '[object V('+this._name+'):'+this.valueOf()+']';
  }

  V.prototype.view = function() {
    // returns an HTML object with VariableName = value
    return new HTML(this.label()+'= <span class=VALUE>'+this.valueOf()+'</span>'+this.unit());
  }

  function v(name,value) {
    // v(name) returns the variable name: rarely used since name alone will represent the same as well as v[name]
    // v(name,value) creates a new variable if it does not already exists and sets a new value
    if (value != undefined) {
      if (v[name]) {
        v[name].setValue(value);
        return v[name]
      }
      return v[name] = new V(name,value);
    }
    return v[name];
  }


  /////////////////////////////////////////////////////////////////////////

  function f(jcFunc) {
    // jcFunc can eiter be a true function (rare since in that case it just returns the function)
    // or a string that is the body of a function that will be called with 2 parameters row and col 
    // in case this function is used inside a table

    if (typeof jcFunc == "string") {
      try {
        if (jcFunc.search(/return/)== -1) {
          jcFunc = 'return '+jcFunc;
        }
        return new Function('row','col','with (v){with(row||{}) {'+jcFunc+'}}');
      }
      catch (e) {
        e.message = 'Error while compiling jcFunc\n'+jcFunc+'\n'+e.message;
        throw e;
      }
    }
    else if (typeof jcFunc == "function") {
      return jcFunc;
    }
    this._error = 'jcFunc argument must either be a function() or a string representing the code of an expression like A+3 or return A+3'; 
    throw new Error(this._error);
  }

  // table //////////////////////////////////////////////

  function Row(obj) {
    for (var k in obj) {
      var c = obj[k];
      if (typeof c == "function") {
        c = new V(undefined,c);  //convert the function into a V
        c._row = this;       //and assign the _row,_col 
        c._col = k;
      }
      this[k] = c;
    }
  }

  Row.prototype.toString = function() {
    return "[object Row]";
  }

  Row.prototype.eachCol = function(func) {
    // func must be function(colname,colObject)
    for (var col in this) {
      if (this.hasOwnProperty(col) && (col != '_table')) {
        func(col,this[col]);
      }
    }
  }

  Row.prototype.span = function (options) {
    options = options || {};
    if (!options.cols) {
      options.cols = {};
      this.eachCol(function (col) {
        options.cols[col]=1;
      });
    }
    var h = '<table border="1px"><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    h += '<tr>';
    for (var col in options.cols) {
      var cell = this[col];
      h += (col=="_id")?'<th>'+cell+'</th>':'<td>'+cell+'</td>';
    }
    h += '</tr></tbody></table>';
    return new HTML(h);
  }

  Row.prototype.list = function() {
    var h = '<table>';
    this.eachCol(function (col,val) {h += '<tr><th>'+col+'</th><td>'+val+'</td></tr>'});
    return h+'</table>';
  }

  Row.prototype.isRow = function() {
    return true;
  }

// Table //////////////////////////////////////////////////////////////

  function Table(name) {
    // constructor of a new Table instance
    this._name = name;
    this._length = 0;
    this._cols = {};
  }
  
  Table.prototype.cols = function(cols) {
    // set the columns that are displayed by default
    // return the table for command chaining

    this._cols = cols;
    return this;
  }

  Table.prototype.updateCols = function(withRow) {
    // updates the cols description with the fields found in withRow
    // normally for internal use only
    // return the table for command chaining

    for (var col in withRow) {
      if ((col != "_table") && withRow.hasOwnProperty(col) && (this._cols[col]==undefined)) {
        this._cols[col] = 1;
      }
    }
    return this;
  }

  Table.prototype.add = function(row) {
    if (row.isRow == undefined) {  //ie normal literal object
      row = new Row(row); // transform it to a Row
    }
    if (row._id) {
      if (this[row._id]) {
        throw new Error('row._id == "'+row._id+'" already exists');
      }
      this[row._id] = row;
    }
    row._table = this;
    this[this._length++] = row;
    this.updateCols(row);
    return this;
  }
  
  Table.prototype.addRows = function(rows) {
    // add multiple rows
    // rows must be an array or array-like of objects
    // columns are ajusted automatically
    for (var i=0; i<rows.length; i++) {
      this.add(rows[i]);
    }
    return this;
  }

  Table.prototype.forEachRow = function(func) {
    // execute func for each row of the table
    // func must be function(i,row)
    // return the table for command chaining
    for (var i=0; i<this._length; i++) {
      func(i,this[i])
    }
    return this;
  }

  Table.prototype.sort = function(cols) {
    // sort the table according to the "cols" criteria
    // cols is an object of the form:
    //   {  col1: 1    // 1 means ascending  alphabetic or numeric order
    //      col2:-1    //-1 means descending alphabetic or numeric order
    //      col3: function(a,b) {... // any function that compare a and b and returns >0 if a>b, <0 if a<b, 0 if a==b
    // return the table for command chaining
    function order(a,b) {
      for (var col in cols) {
        if (typeof cols[col] == 'function') {
          var res = cols[col](a[col],b[col])
          if (res != 0) return res;
        }
        if (a[col] > b[col]) return  cols[col];
        if (a[col] < b[col]) return -cols[col];
      }
      return 0;
    }

    this._savedLenght = this.length;  // to be compatible with sort, must rename _length in .length, but potentially can be used by the _id of a Row
    this.length = this._length;
    Array.prototype.sort.call(this,order);
    this.length = this._savedLength;
    return this;
  }

  Table.prototype.toString = function() {
    // return a string summarizing the table
    return '[object Table('+this._name+') of '+this._length+' rows]';
  }

  Table.prototype.span = function(options) {
    // display the table without its name
    // the span(options) method of table can take many option to customize the presentation of the table
    // options:{
    //    cols:{
    //      col1:{head:1},  // any value make this col as head <th>
    //      col2:1          // any value make this col visible
    options = options || {};
    options.format = options.format || function(formatObj) {return formatObj.toString()};
    options.cols = options.cols || this._cols;
    options.rows = options.rows || range(0,this._length-1);
    var h = '<table border="1px"><thead><tr>';  // TODO modify to style
    for (var col in options.cols) {
      h += '<th>'+col+'</th>';
    }
    h += '</tr></thead><tbody>';    
    for (var i in options.rows) {
      h += '<tr>';
      for (var col in options.cols) {
        var cell = options.format(jc.format(this[i][col]));
        var style = (options.cols[col].style)?'style="'+options.cols[col].style+'"':'';
        h += ((col=="_id") || (options.cols[col].head))?'<th '+style+'>'+cell+'</th>':'<td '+style+'>'+cell+'</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    return new HTML(h);
  }

  Table.prototype.view = function(options) {
    //display the table, including its name in a <div>
    return new HTML('<div><var>'+this._name+'</var>'+this.span(options)+'</div>');
  }

  table = function(name,local) {
    // creates a new table
    // - name is the name of the instance
    // - if local=true, the instance is not registered in v
    if ((local == true) || (name == undefined)) {
      return new Table(name);
    }
    return v[name] = new Table(name);
  }



  // Output ///////////////////////////////////////////////

  function newOutput (codeElement,outputElement) {
    // outputElement is, if specified, the Element where HTML will be dumped
    //         element is essential if HTML uses the finalize() method
    h = new HTML();
    h._codeElement = codeElement;
    h._outputElement = outputElement;
    return h;
  }


  // html ///////////////////////////////////////////////



  function HTML(html) {
    this._html = html || '';
    this._tagsEnd = [];
  }


  HTML.prototype.toString = function() {
    return this._html+this._tagsEnd.join('');
  }

  HTML.prototype.span = HTML.prototype.toString;

  HTML.prototype.html = function (html) {
  // insert any html
    this._html += html;
    return this;
  }

  HTML.prototype.showHtml = function (html) {
  // show html as html code
    this._html += '<span class=INSPECTHTML>'+jc.toHtml(html)+'</span>';
    return this;
  }

  HTML.prototype.showDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+e1.slice(0,i)+'</span><br>e1:<span class=ERROR>'+e1.slice(i)+'</span><br>e2:<span class=ERROR>'+e2.slice(i)+'</span>';
    return this;
  }

  HTML.prototype.showHtmlDiff = function(e1,e2) {
    if (e1.length != e2.length) {
      this._html += '<span class=ERROR>e1.length=='+e1.length+' != e2.length=='+e2.length+'</span>';
    }
    for (var i=0; (i<e1.length) && (i<e2.length); i++) {
      if (e1.charAt(i) != e2.charAt(i)) break;
    }
    this._html += '<span class=SUCCESS>'+jc.toHtml(e1.slice(0,i))+'</span><br>e1:<span class=CODEINERROR>'+jc.toHtml(e1.slice(i))+'</span><br>e2:<span class=CODEINERROR>'+jc.toHtml(e2.slice(i))+'</span>';
    return this;
  }
    
  HTML.prototype.p = function (/*elements*/) {
    this.tag('P',arguments);
    return this;
  }
  HTML.prototype.ul = function (/*elements*/) {
    this.tag('UL',arguments);
    return this;
  }
  HTML.prototype.li = function (/*elements*/) {
    this.tag('LI',arguments);
    return this;
  }
  HTML.prototype.pre = function (/*elements*/) {
    this.tag('PRE',arguments);
    return this;
  }
  HTML.prototype.hr = function (){
    this.tag('HR',[]);
    return this
  }
  HTML.prototype.h = function (/*elements*/) {
    this.tag('H'+jc.htmlIndent,arguments);
    return this;
  }

  HTML.prototype.indent = function(levels) {
    levels = levels || 1;
    jc.htmlIndent += levels;
    return this;
  }

  HTML.prototype.tag = function(tagName,elements) {
    this._html += '<'+tagName+'>';
    var tagEnd = '</'+tagName+'>';
    if (elements.length == 0) {
      this._tagsEnd.push(tagEnd);
      return this;
    }
    for (var i=0;i<elements.length;i++) {
      var e = elements[i];
      if (e.span) {
        this._html += e.span();
      }
      else if (e.view) {
        this._html  += e.view();
      }
      else {
        this._html  += e;
      }
    }  
    this._html += tagEnd;
    return this;
  }

  HTML.prototype.inspect = function(/*objects*/) {
    for (var i=0; i<arguments.length; i++) {
      this._html += jc.inspect(arguments[i]).span();
    }
    return this;
  }

  HTML.prototype.end = function() {
    this._html += this._tagsEnd.pop();
    return this;
  }  
    
  HTML.prototype.sendTo = function(jquerySelector){
    var that = this;
    $(jquerySelector).each(function(i,e){e.innerHTML = that._html});
    return this
  }

  HTML.prototype.finalize = function(finalizationFunc) {
    // finalizationFunc must be a function() {...}
    // note that as this function is defined within a code that will be created in secureEval, we are
    // also inside with(v) so any user variable is availlable as well as output is availlable because of the closure mecanism

    if ((this._codeElement == undefined) || (this._outputElement == undefined)) {
      throw new Error('HTML.finalize can only be used if a code and output Element was associated');
    }
    this._finalize = finalizationFunc;
    jc.finalizations.push(this);
    return this;
  }
    
  HTML.prototype.alert = function(message) {
    window.alert(message);
    return this;
  }

  // formaters ///////////////////////////////////////////
  jc.format = function(obj) {
    return new jc.Format(obj);
  }

  jc.Format = function(obj) {
    // returns a format object that contains the reference to obj
    this.obj = obj;
  }

  jc.Format.prototype.yyyymmdd = function() {
    //returns this, with the .formatted set if the formating was successful
    if ((this.formatted) || (this.obj == undefined) || (this.obj.getFullYear == undefined)) return this;
    this.formatted = this.obj.getFullYear()+'-'+jc.pad(this.obj.getMonth()+1,2)+'-'+jc.pad(this.obj.getDate(),2);
    return this;
  }

  jc.Format.prototype.fixed = function(decimals) {
    // returns this, with .formatted set as a fixed decimal string format if obj was a number
    if ((this.formatted) || (this.obj == undefined) || (typeof this.obj != 'number')) return this;
    this.formatted = this.obj.toFixed(decimals)
    return this;
  }
 
  jc.Format.prototype.undefinedToBlank = function() {
    if (this.formatted) return this; 
    if (this.obj == undefined) {
      this.formatted = '';
    }
    return this;
  }

  jc.Format.prototype.toString = function() {
    if (this.formatted != undefined) return this.formatted;
    if (this.obj) return this.obj.toString();
    return 'undefined';
  }

  
  // helpers /////////////////////////////////////////////

  function range(min,max) {    //TODO devrait �tre un it�rateur, mais n'existe pas encore dans cette version
    var a = [];
    for (var i = min; i <= max; i++) {
      a.push(i);
    }
    return a;
  }

