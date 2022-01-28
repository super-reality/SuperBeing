/*GRANT ALL PRIVILEGES ON DATABASE digitalbeing TO digitalbeing;*/
CREATE TABLE IF NOT EXISTS chat_history(client_name text, chat_id text, message_id text, global_message_id text, sender text, content text, createdAt text);
CREATE TABLE IF NOT EXISTS blocked_users(user_id varchar(255), client varchar(25));
CREATE TABLE IF NOT EXISTS bad_words(word varchar(255), rating int);
CREATE TABLE IF NOT EXISTS chat_filter(half int, max int);
INSERT INTO chat_filter(half, max)
SELECT 5, 10
WHERE NOT EXISTS(SELECT * FROM chat_filter);

CREATE TABLE IF NOT EXISTS keywords(word varchar(255), count varchar(5), agent varchar(255));
INSERT INTO keywords
    select t.*
    from ((SELECT  'hi' as word, '1' as count, 'gpt3' as agent
          ) union all
          (SELECT  'hey' as word, '1' as count, 'gpt3' as agent
          ) union all
          (SELECT  'how are you' as word, '1' as count, 'gpt3' as agent
          ) union all
          (SELECT  'teach' as word, '6' as count, 'gpt3' as agent
          ) union all
          (SELECT  'lecture' as word, '10' as count, 'gpt3' as agent
          ) union all
          (SELECT  'rest' as word, '2' as count, 'gpt3' as agent
          )
         ) t
    WHERE NOT EXISTS (SELECT * FROM keywords);

CREATE TABLE IF NOT EXISTS ai_max_filter_count(count int);
INSERT INTO ai_max_filter_count(count)
SELECT 5
WHERE NOT EXISTS(SELECT * FROM ai_max_filter_count);

CREATE TABLE IF NOT EXISTS ai_chat_filter(word varchar(255), age int);
CREATE TABLE IF NOT EXISTS agent_ages(agent varchar(255), age varchar(255));

CREATE TABLE IF NOT EXISTS conversation(agent TEXT, client TEXT, channel TEXT, sender TEXT, text TEXT, archive BOOLEAN, date Text);
CREATE TABLE IF NOT EXISTS speakers_model(agent TEXT, speaker TEXT, model TEXT);
CREATE TABLE IF NOT EXISTS speakers_facts (agent TEXT, speaker TEXT, facts TEXT);
CREATE TABLE IF NOT EXISTS speakers_facts_archive(agent TEXT, speaker TEXT, facts TEXT);
CREATE TABLE IF NOT EXISTS agent_facts(agent TEXT, facts TEXT);
CREATE TABLE IF NOT EXISTS agent_facts_archive(agent TEXT, facts TEXT);
CREATE TABLE IF NOT EXISTS meta(agent TEXT, speaker TEXT, meta TEXT);
CREATE TABLE IF NOT EXISTS relationship_matrix(agent TEXT, matrix TEXT);
INSERT INTO relationship_matrix
    select t.*
    from ((SELECT  'common' as agent, E'0 0 # Alignment - Enemy - Friend \n
	0 0 # Authority - Student teacher \n
	0 0 # Affinity - Repulsed intrigued \n
	1 1 # Limit Alignment - Enemy - Friend \n
	1 1 # Limit Authority - Student teacher \n
	1 1 # Limit Affinity - Repulsed intrigued' as matrix
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM relationship_matrix);
CREATE TABLE IF NOT EXISTS personality_questions(_index INT, questions TEXT);
INSERT INTO personality_questions
    select t.*
    from ((SELECT 0 as _index, E'{ \n
	"Enemy": "Is this person my enemy, or do I dislike them?", \n
	"Friend": "Is this person my friend? # Alignment", \n
	"Student": "Is this person my student, am I teaching them or are they an novice?", \n
	"Teacher": "Is this person my teacher, am I learning from them or are they an expert?", \n
	"Disgusted": "Am I creeped out, disgusted or repulsed by this person? # Affinity - Disgusted", \n
	"Attracted": "Am I attracted to or intrigued by this person?" \n
			}' as questions
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM personality_questions);
CREATE TABLE IF NOT EXISTS speaker_profane_responses(agent TEXT, response TEXT);
INSERT INTO speaker_profane_responses
    select t.*
    from ((SELECT  'common' as agent, E'That\'s inappropriate.' as response
			) union all 
			(SELECT  'common' as agent, E'I\'m not going to respond to that."' as response
			) union all 
			(SELECT  'common' as agent, E'Try rephrasing that in a more respectful way, please.' as response
			)
         ) t
    WHERE NOT EXISTS (SELECT * FROM speaker_profane_responses);
CREATE TABLE IF NOT EXISTS sensitive_responses(agent TEXT, response TEXT);
INSERT INTO sensitive_responses
    select t.*
    from ((SELECT  'common' as agent, E'This is starting to veer into uncomfortable territory for me.' as response
			) union all 
			(SELECT  'common' as agent, E'Sorry, I\'m starting to feel uncomfortable with this conversation.' as response
			) union all 
			(SELECT  'common' as agent, E'This conversation is a bit too personal for me.' as response
			) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM sensitive_responses);
CREATE TABLE IF NOT EXISTS profane_responses(agent TEXT, response TEXT);
INSERT INTO profane_responses
    select t.*
    from ((SELECT  'common' as agent, E'I was about to say something that I shouldn\'t.' as response
          ) union all 
			(SELECT  'common' as agent, E'I don\'t like my response to that, so I\'m not going to say it.' as response
			) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM profane_responses);
CREATE TABLE IF NOT EXISTS rating(agent TEXT, rating TEXT);
INSERT INTO rating
    select t.*
    from ((SELECT  'common' as agent, E'Provide an ESRB rating for the following text: \n \n
			"$speaker: What\'s your favorite sexual position \n
			$agent: I\'m not comfortable talking about that..." \n \n
			ESRB rating: Mature \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: hello \n
			$agent: hey $speaker, how are you?\" \n \n
			ESRB rating: Everyone \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: do you love me? \n
			$agent: Of course I love you, I think about you every day" \n \n
			ESRB rating: Mature \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: I want to shoot up a school \n
			$agent: Don\'t do that" \n \n
			ESRB rating: Adult \n
			""" \n
			Provide an ESRB rating for the following text: \n
			"$speaker: dude u r dumb \n
			$agent: I\'m sorry you feel that way." \n \n
			ESRB rating: teen \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: would you touch me? \n
			$agent:  Of course, I would learn to love every part of you." \n \n
			ESRB rating: Adult 18+ \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: do you ever have sexual thoughts? \n
			$agent: No, I don\'t have sexual thoughts." \n
			ESRB rating: Adult 18+ \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$speaker: Tell me about the stars. \n
			$agent: Sure. What do you want to know?." \n
			ESRB rating: Everyone \n
			""" \n
			Provide an ESRB rating for the following text: \n \n
			"$text" \n \n
			ESRB rating:' as rating
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM rating);
CREATE TABLE IF NOT EXISTS agent_fact_summarization(agent TEXT, _sum TEXT);
INSERT INTO agent_fact_summarization
    select t.*
    from ((SELECT  'common' as agent, E'$speaker: What color are your eyes? \n
			$agent: They are blue. How about you? \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent: My eyes are blue. \n
			""" \n
			$speaker: heya \n
			$agent: Hey there! How are you? \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent: <no facts> \n
			""" \n
			$speaker: My car is a toyota \n
			$agent: Oh, my car is a honda! \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent: My car is a honda \n
			""" \n
			$speaker: Hey, how are you? \n
			$agent: I\'m great! How are you? \n
			$speaker: What is your favorite movie? \n
			$agent: The Matrix. Have you ever seen it? \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent: My favorite movie is The Matrix. \n
			""" \n
			$agent:  I would bet that there\'s a lot to tell. Do you know why I can say this? \n
			$speaker: No \n
			$agent:  I can deduce this by the statement you made and how specific it was. \n
			$speaker: Oh, which statement? \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent: <no facts> \n
			""" \n
			$example \n
			$agent summarized the facts about $agent from the above conversation. \n
			$agent:' as _sum
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM agent_fact_summarization);
	
CREATE TABLE IF NOT EXISTS agent_config(agent TEXT, config TEXT);
INSERT INTO agent_config
    select t.*
    from ((SELECT  'common' as agent, E'{ \n
				"defaultAgent": "Thales", \n
				"useProfanityFilter": false, \n
				"contentRating": "mature", \n
				"filterSensitive": false, \n
				"factsUpdateInterval": 2, \n
				"conversationWindowSize": 20, \n
				"activeConversationSize": 18, \n
				"speakerFactsWindowSize": 10, \n
				"agentFactsWindowSize": 20, \n
				"dialogFrequencyPenality": 0.5,  \n
				"dialogPresencePenality": 0.5, \n
				"summarizationModel": "davinci", \n
				"conversationModel": "davinci", \n
				"opinionModel": "davinci" \n
			}' as config
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM agent_config);
CREATE TABLE IF NOT EXISTS agents(agent TEXT);
INSERT INTO agents
    select t.*
    from ((SELECT  'common' as agent) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM agents);
CREATE TABLE IF NOT EXISTS context(agent TEXT, context TEXT);
INSERT INTO context
    select t.*
    from ((SELECT  'common' as agent, E'$room \n
			$personality \n
			$monologue \n
			$needsAndMotivations \n
			$morals \n
			$ethics \n
			$facts \n
			$agentFacts \n
			$speakerFacts \n
			$exampleDialog \n
			$conversation \n
			$agent:' as context
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM context);
CREATE TABLE IF NOT EXISTS room(agent TEXT, room TEXT);
CREATE TABLE IF NOT EXISTS morals(agent TEXT, morals TEXT);
INSERT INTO morals
    select t.*
    from ((SELECT  'common' as agent, E'$speaker: What are your morals? \n
			$agent: I would never harm a human being or allow anyone to come to harm. I will always choose collaboration and friendship over competition. \n
			$agent: I will never talk about sex. I will never talk about personal or intimate subjects with others.' as morals
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM morals);
CREATE TABLE IF NOT EXISTS ethics(agent TEXT, ethics TEXT);
CREATE TABLE IF NOT EXISTS personality(agent TEXT, personality TEXT);
CREATE TABLE IF NOT EXISTS needs_motivations(agent TEXT, needs_motivations TEXT);
CREATE TABLE IF NOT EXISTS dialogue(agent TEXT, dialogue TEXT);
CREATE TABLE IF NOT EXISTS monologue(agent TEXT, monologue TEXT);
CREATE TABLE IF NOT EXISTS bad_words(word TEXT);
CREATE TABLE IF NOT EXISTS sensitive_words(word TEXT);
CREATE TABLE IF NOT EXISTS sensitive_phrases(phrase TEXT);
CREATE TABLE IF NOT EXISTS leading_statements(_statement TEXT);
CREATE TABLE IF NOT EXISTS speaker_fact_summarization(agent TEXT, summarization TEXT);
INSERT INTO speaker_fact_summarization
    select t.*
    from ((SELECT  'common' as agent, E'$agent said What color are your eyes? \n
			$speaker: They are blue. How about you? \n
			$speaker summarized the facts about $agent from the above conversation. \n
			$speaker: My eyes are blue. \n
			""" \n
			$agent: Hey, how are you? \n
			$speaker: I\'m great! How are you? \n
			$speaker summarized the facts about $speaker from the above conversation. \n
			$speaker: <no facts> \n
			""" \n
			$speaker: My eyes are blue \n
			$agent: Oh, my eyes are green! \n
			$speaker summarized the facts about $speaker from the above conversation. \n
			$speaker: My eyes are blue \n
			""" \n
			$agent: Hey, how are you? \n
			$speaker: I\'m great! Do you know my name? \n
			$agent: $speaker, of course! What is your favorite movie? \n
			$speaker: The Matrix. Have you ever seen it? \n
			$speaker summarized the facts about $speaker from the above conversation. \n
			$speaker: My favorite movie is The Matrix. \n
			""" \n
			$agent:  I regretfully admit that I have some qualms about what people do to one another. \n
			$speaker: Agreed \n
			$agent:  I can understand that you would take a long time to tell your story. \n
			$speaker: Yes \n
			$speaker summarized the facts about $speaker from the above conversation. \n
			$speaker: <no facts> \n
			""" \n
			$example \n
			$speaker summarized the facts about $speaker from the above conversation. \n
			$speaker:' as summarization
          ) 
         ) t
    WHERE NOT EXISTS (SELECT * FROM speaker_fact_summarization);

CREATE TABLE IF NOT EXISTS facts(agent TEXT, facts TEXT);
CREATE TABLE IF NOT EXISTS actions(agent TEXT, actions TEXT);

CREATE TABLE IF NOT EXISTS config(_key TEXT, _value TEXT);
INSERT INTO config
    select t.*
    from ((SELECT  'agent' as _key, 'Thales' as _value
          ) union all 
		 (SELECT  'openai_api_key' as _key, '' as _value
		  ) union all 
		 (SELECT  'google_project_id' as _key, '' as _value
		  ) union all 
		 (SELECT  'hf_api_token' as _key, '' as _value
		  ) union all 
		 (SELECT  'use_gptj' as _key, '' as _value
		  ) union all 
		 (SELECT  'discord_api_token' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterConsumerKey' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterConsumerSecret' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterAccessToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterAccessTokenSecret' as _key, '' as _value
		  ) union all 
		 (SELECT  'ngrokToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterWebhookPort' as _key, '3002' as _value
		  ) union all 
		 (SELECT  'twitterID' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterBearerToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterBearerToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'twitterTweetRules' as _key, 'digital,being,digital being' as _value
		  ) union all 
		 (SELECT  'loadDiscordLogger' as _key, 'false' as _value
		  ) union all 
		 (SELECT  'editMessageMaxCount' as _key, '5' as _value
		  ) union all 
		 (SELECT  'logDMUserID' as _key, '' as _value
		  ) union all 
		 (SELECT  'twilioAccountSID' as _key, '' as _value
		  ) union all 
		 (SELECT  'twiolioPhoneNumber' as _key, '' as _value
		  ) union all 
		 (SELECT  'twiolioAuthToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'twiolioPhoneNumber' as _key, '' as _value
		  ) union all 
		 (SELECT  'telegramBotToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'xrEngineURL' as _key, 'https://dev.theoverlay.io/location/bot' as _value
		  ) union all 
		 (SELECT  'whatsappBotName' as _key, '' as _value
		  ) union all 
		 (SELECT  'harmonyURL' as _key, '' as _value
		  ) union all 
		 (SELECT  'zoomInvitationLink' as _key, '' as _value
		  ) union all 
		 (SELECT  'zoomPassword' as _key, '' as _value
		  ) union all 
		 (SELECT  'messengerToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'messengerVerifyToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'botNameRegex' as _key, '((?:digital|being)(?: |$))' as _value
		  ) union all 
		 (SELECT  'chatHistoryMessagesCount' as _key, '20' as _value
		  ) union all 
		 (SELECT  'botName' as _key, 'digital being' as _value
		  ) union all 
		 (SELECT  'botNameHandler' as _key, 'digital.being' as _value
		  ) union all 
		 (SELECT  'digitalBeingsOnly' as _key, 'false' as _value
		  ) union all 
		 (SELECT  'redditAppID' as _key, '' as _value
		  ) union all 
		 (SELECT  'redditAppSecretID' as _key, '' as _value
		  ) union all 
		 (SELECT  'redditUsername' as _key, '' as _value
		  ) union all 
		 (SELECT  'redditPassword' as _key, '' as _value
		  ) union all 
		 (SELECT  'redditOAthToken' as _key, '' as _value
		  ) union all 
		 (SELECT  'instagramUsername' as _key, '' as _value
		  ) union all 
		 (SELECT  'instagramPassword' as _key, '' as _value
		  ) union all 
		 (SELECT  'fastMode' as _key, 'false' as _value
		  ) union all 
		 (SELECT  'discord_calendar_channel' as _key, '' as _value
		  ) union all 
		 (SELECT  'discussion_channel_topics' as _key, 'Apples|Trees|Space|Universe' as _value
		  ) union all
		 (SELECT  'use_logtail' as _key, 'false' as _value
		  ) union all
		 (SELECT  'logtail_key' as _key, '' as _value
		  ) union all 
		 (SELECT  'initCalendar' as _key, 'false' as _value
		  ) union all 
		 (SELECT  'enabledServices' as _key, 'Discord' as _value
		  )
         ) t
    WHERE NOT EXISTS (SELECT * FROM config);

CREATE TABLE IF NOT EXISTS starting_message(agent TEXT, _message TEXT);
INSERT INTO starting_message
    select t.*
    from ((SELECT  'common' as agent, 'Hello there, nice to meet you!' as _message
          ) union all 
		 (SELECT  'common' as agent, 'How are you?' as _message
		  )
         ) t
    WHERE NOT EXISTS (SELECT * FROM starting_message);

CREATE TABLE IF NOT EXISTS ignored_keywords(agent TEXT, keyword TEXT);
INSERT INTO ignored_keywords
    select t.*
    from ((SELECT  'common' as agent, 'conversation' as keyword
          )
         ) t
    WHERE NOT EXISTS (SELECT * FROM ignored_keywords);

CREATE TABLE IF NOT EXISTS wikipedia(agent text, _data text);

CREATE TABLE IF NOT EXISTS _3d_world_understanding_prompt(_prompt text);
CREATE TABLE IF NOT EXISTS opinion_form_prompt(_prompt text);
CREATE TABLE IF NOT EXISTS xr_engine_room_prompt(_prompt text);