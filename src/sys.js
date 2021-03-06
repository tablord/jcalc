if (window.ActiveXObject) {

  tb.fso = function(){
  // tb.fso is a collection of function using the ActiveX FileSystemObject in order to read/write text files

  };

  tb.fso.className = 'tb.fso';

  tb.fso.findAll = function (selector,path,depth) {
  // find all files matching selector within path
  // - selector: either a windows selector using * and ? like *.txt
  //             or a regexp where a search returns != -1
  // - path: the path where to search the files
  // - depth: if you want to limit the depth of the search.
  //         notably depth=0 will only search in path, not in its subFolders
  //         if not specified, will search at any depth
    var res = [];
    depth = depth===undefined?Infinity:depth;
    if (typeof selector === 'string') {
      selector = new RegExp(selector.replace(/\*/g,'[^\.]*').replace(/\./g,'\.').replace(/\?/g,'.'));
    }
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    function findRecursive (path,depth,res) {
      // find all files according to selector, and add the results to res
      var files = new Enumerator(fso.GetFolder(path).Files);
      for (files.moveFirst();!files.atEnd();files.moveNext()) {
        var fileName = files.item().name;
        if (fileName.search(selector) != -1) res.push(path+'\\'+fileName);
      }
      if (depth > 0) {
        var subFolders = new Enumerator(fso.GetFolder(path).subFolders);
        for (subFolders.moveFirst();!subFolders.atEnd();subFolders.moveNext()) {
          var subFolder = subFolders.item().name;
          findRecursive (path+'\\'+subFolder,depth-1,res);
        }
      }
    }

    findRecursive(path,depth,res);
    return res;
  };


  tb.fso.findAllFolders = function (selector,path,depth) {
  // find all folders matching selector within path
  // - selector: either a windows selector using * and ? like *.txt
  //             or a regexp where a search returns != -1
  // -path: the path where to search the files
  // -depth: if you want to limit the depth of the search.
  //         notably depth=0 will only search in path, not in its subFolders
  //         if not specified, will search at any depth
    var res = [];
    depth = depth===undefined?Infinity:depth;
    if (typeof selector === 'string') {
      selector = new RegExp(selector.replace(/\*/g,'[^\.]*').replace(/\./g,'\.').replace(/\?/g,'.'));
    }
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    function findRecursive (path,depth,res) {
      // find all files according to selector, and add the results to res
      var folders = new Enumerator(fso.GetFolder(path).subFolders);
      for (folders.moveFirst();!folders.atEnd();folders.moveNext()) {
        var folderName = folders.item().name;
        if (folderName.search(selector) != -1) res.push(path+'\\'+folderName);
      }
      if (depth > 0) {
        var subFolders = new Enumerator(fso.GetFolder(path).subFolders);
        for (subFolders.moveFirst();!subFolders.atEnd();subFolders.moveNext()) {
          var subFolder = subFolders.item().name;
          findRecursive (path+'\\'+subFolder,depth-1,res);
        }
      }
    }

    findRecursive(path,depth,res);
    return res;
  };

  tb.fso.copy = function (source,target) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    fso.CopyFile(source,target);
  };

  tb.fso.writeFile = function (fileName,text,mode) {
    mode = mode || 2;
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var stream = fso.OpenTextFile(fileName,mode,true);
    stream.Write(text);
    stream.Close();
  };

  tb.fso.readFile = function(fileName) {
    try {
      var fso = new ActiveXObject("Scripting.FileSystemObject");
      var stream = fso.OpenTextFile(fileName,1,true);
      var text = stream.ReadAll().toString();
    }
    catch (e) {
      var err = new Error('readFile("'+fileName+'") Error '+ e.message);
    }
    finally {
      if (stream) stream.Close();
      if (err) throw err;
    }
    return text;
  }


  tb.shell = new ActiveXObject("WScript.Shell");
  tb.help.index.add('shell','tb.',['an instance of WScript.Shell',
                                   '.run run a file']);

}
