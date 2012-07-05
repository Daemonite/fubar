function (key,values,rereduce){
    var result = [], found = {};
    
    if (rereduce) values = [].concat.apply([],values);
    
    for (var i=0; i<values.length; i++) found[values[i].toLowerCase()] = 1;
    
    for (var k in found) result.push(k);
    
    return result;
}