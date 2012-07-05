function(doc){
    if (doc.logtype && doc.datetime){
        emit([doc.logtype.toString(),new Date(doc.datetime)],doc);
    }
}