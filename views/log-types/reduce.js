function (key,values,rereduce){
    var result = [], found = {}, i, k;
    
    if (rereduce && values && values.length) values = [].concat.apply([],values);
    
    for (i=0; i<values.length; i++) found[values[i].toLowerCase()] = 1;
    
    for (k in found) result.push(k);
    
    return result;
}