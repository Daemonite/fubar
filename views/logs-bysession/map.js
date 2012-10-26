function(doc){
    if (doc.sessionid) emit([ doc.sessionid, new Date(doc.datetime) ], null);
}