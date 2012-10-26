// Apache 2.0 J Chris Anderson 2011
$(function() {
	
	util.url.machine = util.url.machine || "all";
    
    function drawItems() {
		
		if (util.url.app && util.url.app.length) {
			var appname = util.applications[util.url.app] ? util.applications[util.url.app].name : util.url.app;
			document.title = "Common Errors - " + appname + " - Fubar";
			$("#title").html("Common Errors - " + appname);
		}
	    
        var now = new Date();
		var hours = util.hourRange(new Date(now - 7 * 24 * 60 * 60 * 1000),now);
        var params = { 
            startkey : [ hours[0] ],
            endkey : [ hours[hours.length-1] ],
			group_level : 2,
            update_seq:true
        }
		var machines = $.Deferred();
		
		if (util.url.app && util.url.app.length) {
			params.group_level = (util.url.machine && util.url.machine != "all" ? 4 : 3);
			
			machines = util.deferredView("machines",{ startkey:[util.url.app], endkey:[util.url.app+"_"], group:true }).pipe(function(data){
				var aResult = data.rows.map(function(val){ 
					return {
						name: val.key[1],
						active: (util.url.machine == val.key[1]),
						url: util.rootpath+"errors.html?app="+util.url.app+"&machine="+encodeURIComponent(val.key[1])+(util.url.error ? "&error="+encodeURIComponent(util.url.error) : "")
					}; 
				});
				
				aResult.unshift({
					name: "all",
					active: (util.url.machine == "all"),
					url: util.rootpath+"errors.html?app="+util.url.app+(util.url.error ? "&error="+encodeURIComponent(util.url.error) : "")
				});
				
				return $.when(aResult);
			});
		}
		else{
			machines.resolve([]);
		}
		
        var errors = util.deferredView("logerrors-byhour",params).pipe(function(data){
			if (util.url.app && util.url.app.length)
	            util.setupChanges(data.update_seq,{ filter:"byapp", application:util.url.app });
			else
	            util.setupChanges(data.update_seq);
			util.onChanges(drawItems);
			
			var logs = [], summary = {}, results = [];
			
			if (util.url.machine && util.url.machine != "all") {
				var logs = data.rows.map(function(val){
					var result = {};
					
					if (val.key[2] == util.url.app && val.key[3] == util.url.machine){
						result[val.key[1]] = {
							total: val.value,
							hours: [{ hour:val.key[0], total:val.value }]
						};
					}
					
					return result;
				});
			}
			else if (util.url.app && util.url.app.length) {
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
            var apps = data.rows[0].value.sort().filter(util.showApplication).map(function(val){
				return {
					id : val, 
					name: util.applications[val] ? util.applications[val].name : val,
					active : (util.url.app && util.url.app == val),
					key : val
				};
			}).sort(function(a,b){
				return (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
			});
			
			apps.unshift({
				name : "Overview",
				active : (!util.url.app),
				key : ""
			});
			
			return $.when(apps);
        });
		
        var page = $.when(applications,errors,machines);
        page.done(function(applications,errors,machines){
            
            $("#content").renderTemplate([ "errors", "fragment/pagination" ], { 
                errors : errors, 
                applications : applications.slice(0,7),
				moreapplications : applications.slice(7),
				moreapplicationsactive : (applications.slice(7).length ? applications.slice(7).reduce(function(a,b){ return (typeof(a)=="object" ? a.active : a) || b.active }) : []),
				hasmoreapplications: (applications.length >= 6),
				paginate: 1,
				hasmachines: (machines.length > 0),
				machines: machines,
                applicationlogpage : (util.url.app && util.url.app.length ? util.rootpath+"application.html?app="+util.url.app : "") + (util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : ""),
                errorurl : function(){
                    return function(message,render){
						message = render(message);
						
						if (util.url.app && util.url.app.length)
	                        return util.rootpath+"error.html?app=" + util.url.app + (util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : "") + "&error=" + encodeURIComponent(message);
						else
							return util.rootpath+"error.html?error="+encodeURIComponent(message);
                    };
                },
                applicationurl : function(){
                    return function(app){
						if (app.length)
							return util.rootpath+"errors.html?app="+app + (util.url.machine != "all" ? "&machine="+encodeURIComponent(util.url.machine) : "") + (util.url.error ? "&error="+encodeURIComponent(util.url.error) : "");
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