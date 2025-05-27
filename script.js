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
    var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    if (document.activeElement == document.getElementById("searchBar")){
      if (e.key=="Enter"){ //Search query when enter is pressed
        timeout = null; //Destroy timeout to prevent more resources from being used
        search();
      } else if (chars.indexOf(e.key)!=-1 || e.keyCode == 8){ //Load preview when new alphanumeric/special char/backspace is typed
        timeout = setTimeout(loadPreviews(), 1000);
      }
    }
  });

  document.addEventListener("keydown", function(e){
    if (document.activeElement == document.getElementById("searchBar")){
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
  console.clear();
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
      if (distance == null){
        if (Object.keys(k).indexOf('title_orthography') != -1){
          word = k['title_orthography'].toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        } else {
          word = k['main_notes'].substring(0, k['main_notes'].indexOf(',')).trim();
        }
        
        distance = dist(entry, word);
      }
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

    //JSONify entries & make corrections
    for (var i = 0; i < fEntries.length;i++){
      fEntries[i] = JSON.parse(fEntries[i]);
      var punctIndex = fEntries[i]['definition'][0].length;
      //Transliteration doesn't exist
      if (Object.keys(fEntries[i]).indexOf('translit')==-1){      
        [",", "(", "=", " or "].forEach((punctuationMark)=>{
          var index = fEntries[i]['definition'][0].indexOf(punctuationMark);
          if (index < punctIndex && index != -1){
            punctIndex = index;
          }
        });
        fEntries[i]['translit'] = fEntries[i]['definition'][0].substring(0, punctIndex);
      }
      //Entry doesn't exist or is Greek for some reason
      if (Object.keys(fEntries[i]).indexOf("entry") == -1){
        fEntries[i]['entry'] = fEntries[i]['translit'];
        fEntries[i]['distance'] = dist(entry, fEntries[i]['entry']);

      } 
      if ((fEntries[i]["entry"].codePointAt(0) >= 880) && (fEntries[i]["entry"].codePointAt(0) <= 1023)){
        fEntries[i]['entry'] = fEntries[i]['translit'];
        fEntries[i]['distance'] = dist(entry, fEntries[i]['entry']);
      }
    }

    //Sort fEntries by distance and add first X to entries
    const PAGE_INDEX_NUM = 5;
    fEntries = fEntries.sort(sortDistance);
    if (fEntries.length < PAGE_INDEX_NUM){
      entries.push(fEntries);
    } else {
      entries.push(fEntries.slice(0, PAGE_INDEX_NUM));
    }
    //Restore original path format
    dictionaryLists[list]['file'] = original;

  }

  //Sort entries by greatest common substring
  return entries.sort(sortGCS);
}

function loadPreviews(){
  var input = document.getElementById("searchBar").value;
  if (input.length == 0 || input.replace("[^A-Za-z0-9]","").input>0){
    document.getElementById("possibleQueries").innerHTML = "";
    return;
  } 
  var entries = loadDictionaries(input);
  var table = "<table class = 'searchQueryTable'>";
  entries[0].forEach((entry)=>{
    table += "<tr class = 'entry'><td>";
    var tableEntry;
    var definition = constructDef(entry['definition']);
    if (entry['distance']==0){
      tableEntry = `<b>${entry['translit']}</b> (${entry['pathName']}) &mdash; <i>distance ${entry['distance']}</i><br><hr>${definition.length < 100 ? definition : (definition.substring(0,100)+"...")}<br><br><a href = "${entry['URL']}" target="_blank">Link to \`${entry['translit']}\`</a></td></tr>`;
    } else {
      tableEntry = `${entry['translit']} (${entry['pathName']}) &mdash; <i>distance ${entry['distance']}</i><br><hr>${definition.length < 100 ? definition : (definition.substring(0,100)+"...")}<br><br><a href = "${entry['URL']}" target="_blank">Link to \`${entry['translit']}\`</a></td></tr>`;
    }
    table += `${tableEntry}</hr>`
  });
  table += "</table>";
  document.getElementById("possibleQueries").innerHTML = table;
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
  word1 = word1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  word2 = word2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var GCS = greatestCommonSubstring(word1, word2);
  word1 = word1.substring(GCS.length-1);
  word2 = word2.substring(GCS.length-1);
  var same = 0;
  for (var i = 0; i < Math.min(word1.length, word2.length); i++){
    if (word1[i] == word2[i]){same++;}
  }
  return Math.max(word1.length, word2.length) - same;
}

//Construct definition string, given 2-length array of main notes & senses.

function constructDef(definition){
  var defString = "";
  var mainNotesEmpty = definition[0] == null;
  var sensesEmpty = definition[1] == null;
  //If both are empty, return ""
  if (mainNotesEmpty && sensesEmpty){
    return "";
  } 
  //If main notes is empty, go to senses (combining each section of list, using typeof() to distinguish between String & Array)
  else if (mainNotesEmpty){
    definition[1].forEach((section)=>{
      defString += ` ${definition[1].indexOf(section)+1}.) `;
      if (typeof(section) == "string"){
        defString += section;
      } else {
        console.log(section);
        defString += [].concat(...section).join(". ");
      }
    });
    return defString;
  }
  //Else if senses is empty, go to main notes 
  else if (sensesEmpty){
    return definition[0];
  }
  //If both are full, combine main notes & senses in same fashion as above
  defString += definition[0];
  definition[1].forEach((section)=>{
    defString += ` ${definition[1].indexOf(section)+1}.) `;
    if (typeof(section) == "string"){
      defString += section;
    } else {

      defString += [].concat(...section).join(". ");
    }
  });

  return defString;
}

//Find greatest common substring between 2 strings
function greatestCommonSubstring(string1, string2){
  var i = 1;
  while (i <= Math.min(string1.length, string2.length)){
    if (string1.substring(0, i) != string2.substring(0,i)){
      if (i==1){return "";}
      return string1.substring(0,i-1);
    }
    i++;
  }
  return string1.substring(0,i-1);
}

//Sort two entries of a list by distance
function sortDistance(a, b) {
  if (a['distance'] == 0){
      return -1;
  } else if (b['distance'] == 0){
      return 1;
  } return a['distance'] - b['distance'];
};

function sortGCS(a,b){
  var c = greatestCommonSubstring(entry, a['entry'].normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  var d = greatestCommonSubstring(entry, b['entry'].normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  console.log(c);
  return d.length - c.length;
}