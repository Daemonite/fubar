// Apache 2.0 J Chris Anderson 2011
$(function() {
    
	if (util.url.app && util.url.app.length) {
		document.title = "Common Errors - " + util.url.app + " - Fubar";
		$("#title").html("Common Errors - " + util.url.app);
	}
    
    function drawItems() {
        var now = new Date();
		var hours = util.hourRange(new Date(now - 7 * 24 * 60 * 60 * 1000),now);
        var params = { 
            startkey : [ hours[0] ],
            endkey : [ hours[hours.length-1] ],
			group_level : 2,
            update_seq:true
        }
		
		if (util.url.app && util.url.app.length)
			params.group_level = 3;
		
        var errors = util.deferredView("logerrors-byhour",params).pipe(function(data){
			if (util.url.app && util.url.app.length)
	            util.setupChanges(data.update_seq,{ filter:"byapp", application:util.url.app });
			else
	            util.setupChanges(data.update_seq);
			util.onChanges(drawItems);
			
			var logs = [], summary = {}, results = [];
			
			if (util.url.app && util.url.app.length) {
				var logs = data.rows.map(function(val){
					var result = {};
					
					if (val.key[2] == util.url.app){
						result[val.key[1]] = {
							total: val.value,
							hours: [{ hour:val.key[0], total:val.value }]
						};
					}
					
					return result;
				});
			}
			else {
				var logs = data.rows.map(function(val){
					var result = {};
					
					result[val.key[1]] = {
						total: val.value,
						hours: [{ hour:val.key[0], total:val.value }]
					};
					
					return result;
				});
			}
			
			summary = logs.reduce(function(a,b){
				var result = {};
				
				for (var k in a)
					result[k] = a[k];
				
				for (var k in b){
					if (result[k]) {
						result[k].total += b[k].total;
						result[k].hours = result[k].hours.concat(b[k].hours);
					}
					else {
						result[k] = b[k];
					}
				}
				
				return result;
			});
			
			for (var k in summary){
				results.push({
					message : k,
					total : summary[k].total,
					data : summary[k].hours.sort(function(a,b){ return b.total-a.total; }).map(function(val){ return val.total; }),
					active : (util.url.error && util.url.error == k ? true : false)
				});
			}
			results.sort(function(a,b){ return b.total - a.total; });
			
			return $.when(results);
        });
        
        var applications = util.deferredView("applications",{ update_seq:true }).pipe(function(data){
            var apps = data.rows[0].value.sort().map(function(val){
				return {
					name : val,
					active : (util.url.app && util.url.app == val),
					key : val
				};
			});
			
			apps.unshift({
				name : "Overview",
				active : (!util.url.app),
				key : ""
			});
			
			return $.when(apps);
        });
		
        var page = $.when(applications,errors);
        page.done(function(applications,errors){
            
            $("#content").renderTemplate([ "errors", "fragment/pagination" ], { 
                errors : errors, 
                applications : applications,
				paginate: 1,
                applicationlogpage : (util.url.app && util.url.app.length ? util.rootpath+"application.html?app="+util.url.app : ""),
                errorurl : function(){
                    return function(message,render){
						message = render(message);
						
						if (util.url.app && util.url.app.length)
	                        return util.rootpath+"error.html?app="+util.url.app+"&error="+encodeURIComponent(message);
						else
							return util.rootpath+"error.html?error="+encodeURIComponent(message);
                    };
                },
                applicationurl : function(){
                    return function(app){
						if (app.length)
							return util.rootpath+"errors.html?app="+app + (util.url.error ? "&error="+encodeURIComponent(util.url.error) : "");
						else
                        	return util.rootpath+"errors.html" + (util.url.error ? "?error="+encodeURIComponent(util.url.error) : "");
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
	
    $(".error-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
	util.onSessionReady(drawItems);
    
 });