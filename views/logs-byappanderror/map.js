function(doc){
    if (doc.logtype && doc.logtype == "error"){
        emit([ doc.message, doc.application, new Date(doc.datetime) ], null);
    }
}