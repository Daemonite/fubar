function(doc){
    if (doc.logtype && doc.logtype == "error"){
        emit([ doc.message, doc.application, doc.machinename, new Date(doc.datetime) ], null);
    }
}