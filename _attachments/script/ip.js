// Apache 2.0 J Chris Anderson 2011
$(function() {
    
    document.title = "IP Address - "+util.url.ip+" - Fubar";
    $("#title").html("IP Address - "+util.url.ip);
    
    function drawItems() {
		
        var params = { 
            startkey : [ util.url.app, util.url.ip, new Date() ],
            endkey : [ util.url.app, util.url.ip ],
			descending : true,
            update_seq : true 
        }
        
        var logs = util.deferredView("logs-byip",params).pipe(function(data){
            util.setupChanges(data.update_seq,{ filter:"byip", ip:util.url.ip });
			util.onChanges(drawItems);
            
            return $.when({
                logs : data.rows.map(function(val,index){ 
                    if (util.url.logid && util.url.logid == val.value._id) val.value.active = true; 
                    val.value["type-"+val.value.logtype] = true;
                    if (val.value.event) val.value["event-"+val.value.event] = true;
                    val.value["logseq"] = index + 1;
                    return val.value; 
                })
            })
        });
        
        logs.done(function(logpage){
            
			var templates = [ "logs", "fragment/pagination", "fragment/log-teaser", "log-teaser/default" ];
			
			for (var i = 0; i < logpage.logs.length; i++) templates.push("log-teaser/"+logpage.logs[i].logtype);
			
            $("#content").renderTemplate(templates, { 
                logs : logpage.logs, 
                includelogtype : true,
                paginate : 1,
                applicationsummarypage : util.rootpath+"errors.html?app="+logpage.logs[0].application,
                applicationlogpage : util.rootpath+"application.html?app="+logpage.logs[0].application+"&logtype=error",
                logurl : function(){
                    return function(logid){
                        return util.rootpath+"log.html?id="+logid;
                    };
                }
            },function(){
                this.find(".time a").prettyDate();
            });
            
        });
        logs.fail(util.renderError);
        
    };
    
    $(".log-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
	util.onSessionReady(drawItems);
	
 });