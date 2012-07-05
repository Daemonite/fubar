function (doc){
    if (doc.logtype){
        emit([ doc.application, doc.datetimeorderable.slice(0,13), doc.logtype.toString() ], 1);
    }
}