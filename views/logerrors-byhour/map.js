function(doc){
    if (doc.logtype && doc.logtype == "error"){
        emit([ doc.datetimeorderable.slice(0,13), doc.message, doc.application ], doc);
    }
}