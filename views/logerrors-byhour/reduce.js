function (key,values,rereduce){
    if (!rereduce) values = [ values.length ];
    
    return sum(values);
}