package com.mtg.deckbuilder.deck.rgpd;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/** Subscribes deck-service to the {@code user-events} Redis Pub/Sub channel. */
@Configuration
public class UserEventsListenerConfig {

    @Bean
    ChannelTopic userEventsTopic(@Value("${user-events.channel:user-events}") String channel) {
        return new ChannelTopic(channel);
    }

    @Bean
    RedisMessageListenerContainer userEventsContainer(
            RedisConnectionFactory connectionFactory,
            UserDeletedListener listener,
            ChannelTopic userEventsTopic) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(listener, userEventsTopic);
        return container;
    }
}
