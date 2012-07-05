function(doc){
    if (doc.logtype && doc.logtype == "error"){
        emit([ doc.message, new Date(doc.datetime) ], doc);
    }
}