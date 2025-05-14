//List of dictionaries + formatting for entries
var dictionaryLists = {
  "Lewis & Short":{
    "url": "https://raw.githubusercontent.com/IohannesArnold/lewis-short-json/refs/heads/master/",
    "file": "ls_{letterUppercase}.json", //Set "file" to be all entries for the letter A
    "abbr": "LS"
  }
}

/*Page system to use for previews
  {pageNo: [DictionaryEntry, DictionaryEntry...(5 total)]}
*/
var pages = {
  1:[]
}

var page = window.location.pathname;

//entry.html will also have a searchBar so no change is needed here to remedy it
document.addEventListener("DOMContentLoaded", function(e) {
  var timeout;
  //If entry.html, find entry and load it up
  if (page.includes("entry.html")){
    console.log("entry thing"); //don't forget to acc do this 🙏 
  }

  /*Query search when enter key is pressed
  (& if user is currently focused on search bar)*/
  document.addEventListener("keyup", function(e){
    if (document.activeElement == document.getElementById("searchBar")){
      if (e.key=="Enter"){ //Search query when enter is pressed
        timeout = null; //Destroy timeout to prevent more resources from being used
        search();
      } else if ((e.keyCode > 47 && e.keyCode < 58) || e.keyCode > 95 || e.keyCode == 8){ //Load preview when new alphanumeric/special char/backspace is typed
        timeout = setTimeout(loadPreviews(), 500);
      }
    }
  });

  document.addEventListener("keydown", function(e){
    if (document.activeElement == document.getElementById("searchBar")){
      console.log("key down");
      clearTimeout(timeout);
    }

});

/*This should return a standardized dictionary with
  term name, what its referred to in JSON/TXT file, what
  dictionary its from, and the definition.

  Entry syntax:
  {
    'entry': String, (ie "Aărōn")
    'pathName': String, (ie "LS:Aaron")
    'declension': int (1-5)
    'dictionary': String, (ie "Lewis & Short")
    'definition': String (ie "(Aārōn, Prud. Psych. 884),  or...")
  }
*/
function loadDictionaries(entry){
  var entries = [];
  /*
    Figure out how to load dictionary files w/o delay, b/c with how much
    someone might type this function can be called a couple of times
    to say the least
  */
  for (const list of Object.keys(dictionaryLists)){
    document.getElementById("placeholderText").style.color="";
    document.getElementById("placeholderText").innerHTML = "";
    var abbreviation = dictionaryLists[list]['abbr'];
    var pathName = dictionaryLists[list]['file'];
    var original = pathName;
    //If dictionary uses uppercase characters for indexing
    if (pathName.includes("\{letterUppercase\}")){
      pathName = pathName.replace("\{letterUppercase\}", entry.substring(0,1).toUpperCase());
    }
    //Other possibilities for indexing: dictionary uses lowercase characters,
    //words...

    //Load dictionary section
    dictionarySection = getDictionaryEntry(dictionaryLists[list]['url']+pathName);
    if (dictionarySection == "404"){
      document.getElementById("placeholderText").style.color="red";
      document.getElementById("placeholderText").innerHTML = `File doesn't exist: '${pathName}'`;
      return;
    }

    //Go through dictionary entry and find matches/near-matches  
    //Sort possible entries by distance and add the first X results to entries
    var fEntries = [];
    for (const x in Object.keys(dictionarySection)){
      var k = dictionarySection[x];
      var word = k['key'];
      //Calculate distance between entry and each dictionary key
      var distance = dist(entry, word);
      //Add to entries list
      //(to-do: change items for DictionaryEntry when more than
      //1 dictionary is implemented)
      if (k['entry_type']=="main"){
        fEntries.push(JSON.stringify({
          "entry": Object.keys(k).includes('title_orthography') ? k['title_orthography'] : k['key'],
          "translit": k['title_orthography'],
          "pathName":abbreviation+":"+k['key'],
          "definition":[k['main_notes'], k['senses']],
          "distance":distance,
          "URL":`https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0059:entry=${k['key']}`
        }));
      } else{
        fEntries.push(JSON.stringify({
          "entry": k['greek_word'],
          "translit": k['title_orthography'],
          "pathName":abbreviation+":"+k['key'],
          "definition":[k['main_notes'], k['senses']],
          "distance":distance,
          "URL":`https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0059:entry=${k['key']}`
        }));
      }
    }

    //JSONify entries
    for (var i = 0; i < fEntries.length;i++){
      fEntries[i] = JSON.parse(fEntries[i]);
    }

    //Sort fEntries by distance and add first X to entries
    const PAGE_INDEX_NUM = 5;
    fEntries = fEntries.sort((a, b) => {
        if (a['distance'] == 0){
            return -1;
        } else if (b['distance'] == 0){
            return 1;
        } return a['distance'] - b['distance'];
    });
    if (fEntries.length < PAGE_INDEX_NUM){
      entries.push(fEntries);
    } else {
      entries.push(fEntries.slice(0, PAGE_INDEX_NUM));
    }
    //Restore original path format
    dictionaryLists[list]['file'] = original;

  }

  //Sort entries again by distance & return entries
  //(https://stackoverflow.com/a/28311228)
  return entries.sort((a, b) =>{return a['distance']-b['distance']});
}

function loadPreviews(){
  console.log("b");
  return;
}

function search(){
  /*
    For now, the only dictionary list is that of Lewis & Short
    (https://github.com/IohannesArnold/lewis-short-json)
    - others may be added once the general framework is set up
  */
  //Get search term & sanitze it
  //(https://stackoverflow.com/a/57299140)
  var sanitzedTerm = document.getElementById("searchBar").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  //Load entries for sanitzed term in list
  var entries = loadDictionaries(sanitzedTerm.toLowerCase())[0];
  console.log(entries);
  if (entries==null){
    return;
  }
  //If present in one list, load up definition
  if (entries.length == 1){
    location.pathname = `entry.html?term=${entries[0]['pathName']}`;
  }
  //If present in multiple lists, ask user to choose from available entries
  //(up to 5, page system for anything else)
  if (entries.length > 1){

  }
  //If present in no pages, window.alert("This term has not been found in any available dictionaries.");
  else {
    //window.alert("This term has not been found in any available dictionaries.");
  }
}
});

//Send HTTP request to get dictionary section.
function getDictionaryEntry(URL){
  const req = new XMLHttpRequest();
  var parsed;

  //Open & set logic for when request is ready
  req.open("GET", URL, false);
  req.onreadystatechange=(e)=>{
      //Parse response when request is done and 
      //if 200 status is given
      if (req.readyState == 4 && req.status == 200){
        var response = req.response;
        parsed = JSON.parse(response);
    } 
      if (req.status == 404){
        parsed = "404";
      }   
  }
  //Send request
  req.send();
  return parsed;
}


/*Calculate distance between two words*/
function dist(word1, word2){

  function iter(word1, word2){
    var matched = false;
    var diff = 0;
    //Determine greatest common beginning substring
    //After greatest common beginning substring, determine how many 
    //individual characters are changed
    for (var i = 0; i < Math.min(word1.length,word2.length); i++){
      //Greatest common beginning substring
      if (word1.substring(0, i) != word2.substring(0,i) && !matched){
        matched=true;
      } if (matched){
          diff = 1;
          word1 = word1.substring(i+1).split(""); word2 = word2.substring(i+1).split("");
          //Figure out different characters + extra characters
          //This for-loop here needs to be worked on, otherwise the algo is fine
          for (var x = 0; x < Math.min(word1.length, word2.length); x++){
            if (word1[x]!=word2[x]){diff += 1;}
          }
          return diff + Math.abs(word1.length-word2.length) + 1;
      }
    }
  }

  word1 = word1.toLowerCase();
  word2 = word2.toLowerCase();
  word1 = word1.indexOf(",")!=-1 ? word1.substring(0,word1.indexOf(",")) : word1;
  word2 = word2.indexOf(",")!=-1 ? word2.substring(0,word2.indexOf(",")) : word2;
  if (word1 === word2){return 0;}
  try{
    if (word1 === word2.substring(0,word1.length)){
      return word2.length - word1.length;
    } else if (word2 === word1.substring(0, word2.length)){
      return word1.length - word2.length;
    } else {
      return iter(word1, word2);
    } 
  }
  catch{
    return iter(word1, word2);
  }
}