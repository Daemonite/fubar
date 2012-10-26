function (doc){
    if (doc.logtype) emit([ doc.application, doc.machinename ], 1);
}