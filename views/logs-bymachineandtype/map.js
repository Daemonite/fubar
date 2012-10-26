function(doc){
    if (doc.logtype) emit([ doc.application, doc.machinename, doc.logtype.toString(), new Date(doc.datetime) ], null);
}