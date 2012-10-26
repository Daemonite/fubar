function(doc){
    if (doc.logtype) emit([ doc.application, doc.logtype.toString(), new Date(doc.datetime) ], null);
}