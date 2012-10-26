function(doc){
    if (doc.remoteaddress) emit([ doc.application, doc.remoteaddress, new Date(doc.datetime) ], null);
}