function(doc){
    if (doc.logtype) emit(null,doc.logtype.toString());
}