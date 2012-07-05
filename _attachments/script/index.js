// Apache 2.0 J Chris Anderson 2011
$(function() {
    
    function drawItems() {
        var logtypes = util.deferredView("log-types").pipe(function(data){
			return $.when(data.rows.length==0 ? [] : data.rows[0].value.sort().map(function(val){ return { name:val }; }));
        });
        
        var applications = util.deferredView("applications",{ update_seq:true }).pipe(function(data){
            var apps = data.rows[0].value.sort();
            var now = new Date();
            var hours = util.hourRange(new Date(now - 7 * 24 * 60 * 60 * 1000),now);
            
            util.setupChanges(data.update_seq);
			util.onChanges(drawItems);
            
            var applogcounts = apps.map(function(app){
                return util.deferredView("log-types-byhour",{ startkey:[ app, hours[0] ], endkey:[ app, hours[hours.length-1] ], group:true }).pipe(function(data){
                    var result = { name : app, logtypes : {} }, j = 0, logtypes = {}, newdata = [], newval = 0;
                    
                    for (var i=0; i<data.rows.length; i++){
                        logtypes[data.rows[i].key[2]] = logtypes[data.rows[i].key[2]] || {};
                        logtypes[data.rows[i].key[2]][data.rows[i].key[1].slice(0,14)] = data.rows[i].value;
                    }
                    
                    for (var k in logtypes){
                        newdata = [];
                        
                        for (var i=0; i<hours.length-1; i++){
                            newval = 0;
                            
                            for (var j=0; j<=2; j++){
                                if (logtypes[k][hours[i+j]])
                                    newval += logtypes[k][hours[i+j]];
                            }
                            
                            i += 2;
                            newdata.push(newval);
                        }
                        
                        result.logtypes[k] = newdata;
                    }
                    
                    return result;
                });
            });
            
            return $.when.apply($,applogcounts);
        });
        
        var page = $.when(logtypes,applications);
        page.done(function(logtypes,apps){
            if (apps.constructor != Array) apps = [ apps ];
            
            for (var i=0; i<apps.length; i++){
                var newdata = [];
                
                for (var j=0; j<logtypes.length; j++){
                    if (apps[i].logtypes[logtypes[j].name]){
                        newdata.push({ name:logtypes[j].name, data:apps[i].logtypes[logtypes[j].name] });
                    }
                    else {
                        newdata.push({ name:logtypes[j].name, data:[] });
                        for (var k=0; k<8*7; k++) newdata[newdata.length-1].data.push(0);
                    }
                }
                
                apps[i].logtypes = newdata;
            }
            
            $("#content").renderTemplate("applications", { 
                applications : apps, 
                logtypes : logtypes, 
                applicationurl : function(){ 
                    return function(app){ 
                        return util.rootpath+"application.html?app="+app+"&logtype=error"; 
                    }; 
                },
                sparkline : function(){
                    return function(text,render){
						return util.sparkline(render(text));
                    };
                }
            });
        });
        page.fail(util.renderError);

    };
	
    $(".application-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
	util.onSessionReady(drawItems);
 });