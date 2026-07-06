package com.mtg.deckbuilder.forum.event;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/** Subscribes forum-service to the {@code forum-events} Redis Pub/Sub channel for realtime fan-out. */
@Configuration
public class ForumEventsListenerConfig {

    @Bean
    ChannelTopic forumEventsTopic(@Value("${forum.events.channel:forum-events}") String channel) {
        return new ChannelTopic(channel);
    }

    @Bean
    RedisMessageListenerContainer forumEventsContainer(
            RedisConnectionFactory connectionFactory,
            ForumEventSubscriber subscriber,
            ChannelTopic forumEventsTopic) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(subscriber, forumEventsTopic);
        return container;
    }
}
